import assert from "node:assert/strict";
import test from "node:test";
import {
	compatibleSummaryGenerator,
	createSummaryService,
	SUMMARY_VERSION,
	summaryFingerprint,
} from "./blog-summary.ts";

const post = {
	id: "git",
	title: "Git",
	body: "# 暂存\n\n撤销暂存保留工作区。",
	description: "原简介",
};

test("summary calls allow the approved 5000-token budget and reject truncated text", async () => {
	let budget;
	const generate = compatibleSummaryGenerator(
		{
			BLOG_LLM_BASE_URL: "https://model.invalid/v1",
			BLOG_LLM_MODEL: "chosen",
			BLOG_LLM_API_KEY: "secret",
		},
		async (_url, init) => {
			budget = JSON.parse(init.body).max_tokens;
			return Response.json({
				choices: [
					{ finish_reason: "length", message: { content: "这是被截断的摘要" } },
				],
			});
		},
	);
	await assert.rejects(
		generate("正文", true),
		(error) => error.code === "output_token_limit",
	);
	assert.equal(budget, 5000);
});

test("empty responses retain a safe diagnostic instead of provider text", async () => {
	const generate = compatibleSummaryGenerator(
		{
			BLOG_LLM_BASE_URL: "https://model.invalid/v1",
			BLOG_LLM_MODEL: "chosen",
			BLOG_LLM_API_KEY: "secret",
		},
		async () =>
			Response.json({
				choices: [
					{
						finish_reason: "stop",
						message: { content: "", reasoning_content: "private reasoning" },
					},
				],
			}),
	);
	await assert.rejects(generate("private article", true), (error) => {
		assert.equal(error.code, "empty_output");
		assert.equal(error.finishReason, "stop");
		assert.ok(!String(error).includes("private"));
		return true;
	});
});

test("oversized final summaries have a distinct failure code", async () => {
	const service = createSummaryService({
		store: cache(),
		model: "chosen",
		generate: async () => "字".repeat(101),
	});
	await assert.rejects(
		service.summarize(post),
		(error) => error.code === "summary_too_long",
	);
});
function cache() {
	const values = new Map();
	return {
		get: async (id) => values.get(id),
		put: async (id, value) => {
			values.set(id, value);
		},
	};
}
test("replaces legacy introductions with an AI summary immediately and reuses unchanged v3 summaries", async () => {
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
	await store.put(post.id, {
		contentHash: summaryFingerprint(post),
		summary: "原简介",
		source: "manual",
	});
	assert.equal(await service.summarize(post), "撤销暂存时保留工作区修改。");
	await service.summarize(post);
	assert.equal(calls, 1);
	assert.equal((await store.get(post.id)).source, "model");
	assert.equal((await store.get(post.id)).summaryVersion, SUMMARY_VERSION);
	await service.summarize({ ...post, body: `${post.body}\n新增段落` });
	assert.equal(calls, 2);
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
	assert.equal(calls, 1);
	await Promise.all([
		service.summarize({ ...post, body: `${post.body}\n修改` }),
		service.summarize({ ...post, body: `${post.body}\n修改` }),
	]);
	assert.equal(calls, 2);
	assert.equal(
		await service.summarize({ ...post, password: "secret" }),
		"原简介",
	);
	assert.equal(await service.summarize({ ...post, draft: true }), "原简介");
	assert.equal(calls, 2);
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
	await store.put(post.id, {
		contentHash: summaryFingerprint(post),
		summary: "原简介",
		source: "manual",
	});
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

test("rewrites an oversized AI summary once instead of truncating it", async () => {
	let calls = 0;
	const store = cache();
	const service = createSummaryService({
		store,
		model: "chosen",
		generate: async (text, final, compact) => {
			assert.equal(final, true);
			if (++calls === 1) return "技术名词".repeat(30);
			assert.equal(compact, true);
			assert.match(text, /技术名词/);
			return "文章介绍核心技术及其应用边界。";
		},
	});
	assert.equal(await service.summarize(post), "文章介绍核心技术及其应用边界。");
	assert.equal(calls, 2);
});

test("rejects repeated oversized summaries without truncating or replacing a valid stored introduction", async () => {
	let calls = 0;
	const store = cache();
	await store.put(post.id, {
		contentHash: summaryFingerprint(post),
		summary: "原简介",
		source: "manual",
	});
	const service = createSummaryService({
		store,
		model: "chosen",
		generate: async () => {
			calls++;
			return "字".repeat(101);
		},
	});
	await assert.rejects(service.summarize(post), /摘要/);
	assert.equal((await store.get(post.id)).summary, "原简介");
	assert.equal(calls, 2);
});

test("one provider failure stops the remaining regeneration queue without replacing old summaries", async () => {
	let calls = 0;
	const store = cache();
	const service = createSummaryService({
		store,
		model: "chosen",
		generate: async () => {
			calls++;
			throw Error("provider unavailable");
		},
	});
	const results = await Promise.allSettled([
		service.summarize(post),
		service.summarize({ ...post, id: "other" }),
	]);
	assert.ok(results.every((result) => result.status === "rejected"));
	assert.equal(calls, 1);
	assert.equal(await store.get(post.id), undefined);
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
test("compact rewrite is a system instruction and the candidate stays quoted data", async () => {
	const generate = compatibleSummaryGenerator(
		{
			BLOG_LLM_BASE_URL: "https://model.invalid/v1",
			BLOG_LLM_MODEL: "test-model",
			BLOG_LLM_API_KEY: "test-only",
		},
		async (_input, init) => {
			const body = JSON.parse(init.body);
			assert.match(body.messages[0].content, /30至50/);
			assert.deepEqual(JSON.parse(body.messages[1].content), {
				articleData: "候选摘要",
			});
			return Response.json({
				choices: [{ message: { content: "压缩摘要。" } }],
			});
		},
	);
	assert.equal(await generate("候选摘要", true, true), "压缩摘要。");
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
