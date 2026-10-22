import assert from "node:assert/strict";
import test from "node:test";
import {
	compatibleSummaryGenerator,
	createSummaryService,
	summaryFingerprint,
} from "./blog-summary.ts";

const post = {
	id: "git",
	title: "Git",
	body: "# 暂存\n\n撤销暂存保留工作区。",
	description: "原简介",
};
function cache() {
	const values = new Map();
	return {
		get: async (id) => values.get(id),
		put: async (id, value) => {
			values.set(id, value);
		},
	};
}
test("seeds the existing description verbatim and regenerates only when the body changes", async () => {
	let calls = 0;
	const store = cache();
	const service = createSummaryService({
		store,
		model: "chosen",
		generate: async () => {
			calls++;
			return "撤销暂存时保留工作区修改。";
		},
	});
	assert.equal(await service.summarize(post), "原简介");
	await service.summarize(post);
	assert.equal(calls, 0);
	assert.equal((await store.get(post.id)).source, "manual");
	await service.summarize({ ...post, body: `${post.body}\n新增段落` });
	assert.equal(calls, 1);
	assert.equal((await store.get(post.id)).source, "model");
	const otherModel = createSummaryService({
		store,
		model: "other",
		generate: async () =>
			assert.fail("model changes must not rewrite unchanged posts"),
	});
	assert.equal(
		await otherModel.summarize({ ...post, body: `${post.body}\n新增段落` }),
		"撤销暂存时保留工作区修改。",
	);
	assert.equal(
		summaryFingerprint(post),
		summaryFingerprint({
			...post,
			title: "新标题",
			body: post.body.replace(/\n/g, "\r\n"),
		}),
	);
});
test("deduplicates concurrent generation and never calls a model for draft or locked content", async () => {
	let calls = 0;
	const service = createSummaryService({
		store: cache(),
		model: "chosen",
		generate: async () => {
			calls++;
			return "这是公开文章的摘要。";
		},
	});
	await Promise.all([service.summarize(post), service.summarize(post)]);
	assert.equal(calls, 0);
	await Promise.all([
		service.summarize({ ...post, body: `${post.body}\n修改` }),
		service.summarize({ ...post, body: `${post.body}\n修改` }),
	]);
	assert.equal(calls, 1);
	assert.equal(
		await service.summarize({ ...post, password: "secret" }),
		"原简介",
	);
	assert.equal(await service.summarize({ ...post, draft: true }), "原简介");
	assert.equal(calls, 1);
});
test("covers the end of a long article and merges partial summaries", async () => {
	const inputs = [];
	const service = createSummaryService({
		store: cache(),
		model: "chosen",
		generate: async (text, final) => {
			inputs.push(text);
			return final
				? "长文介绍了背景及末尾的安全边界。"
				: "这一部分介绍了背景和边界。";
		},
	});
	await service.summarize(post);
	await service.summarize({
		...post,
		body: `# 长文\n${"正文背景。".repeat(4000)}\n末尾独有的安全边界`,
	});
	assert.ok(inputs.length > 2);
	assert.ok(inputs.some((text) => text.includes("末尾独有的安全边界")));
	assert.ok(inputs.every((text) => text.length < 8000));
});
test("failed or invalid generation cannot become a cached summary", async () => {
	const store = cache();
	const failed = createSummaryService({
		store,
		model: "chosen",
		generate: async () => {
			throw Error("upstream");
		},
	});
	await failed.summarize(post);
	await assert.rejects(
		failed.summarize({ ...post, body: `${post.body}\n修改` }),
	);
	assert.equal((await store.get(post.id)).summary, "原简介");
	const invalid = createSummaryService({
		store,
		model: "chosen",
		generate: async () => "https://outside.example",
	});
	await assert.rejects(
		invalid.summarize({ ...post, body: `${post.body}\n修改` }),
	);
});

test("initial seeding needs no model and accepts empty or long existing descriptions", async () => {
	const store = cache();
	const service = createSummaryService({ store, model: "" });
	assert.equal(
		await service.summarize({ ...post, description: "原样。".repeat(100) }),
		"原样。".repeat(100),
	);
	assert.equal(
		await service.summarize({ ...post, id: "empty", description: "" }),
		"",
	);
	await service.summarize({ ...post, body: `${post.body}\n修改` });
	assert.equal(
		(await store.get(post.id)).contentHash,
		summaryFingerprint(post),
	);
});
test("compatible generator uses the configured model, makes one attempt and hides upstream errors", async () => {
	let calls = 0;
	const generate = compatibleSummaryGenerator(
		{
			BLOG_LLM_BASE_URL: "https://model.invalid/v1",
			BLOG_LLM_MODEL: "chosen",
			BLOG_LLM_API_KEY: "secret",
		},
		async (url, init) => {
			calls++;
			assert.equal(String(url), "https://model.invalid/v1/chat/completions");
			assert.equal(JSON.parse(init.body).model, "chosen");
			assert.equal(init.headers.Authorization, "Bearer secret");
			return new Response("secret upstream details", { status: 429 });
		},
	);
	await assert.rejects(
		generate("原文", true),
		(error) => !error.message.includes("secret"),
	);
	assert.equal(calls, 1);
});
