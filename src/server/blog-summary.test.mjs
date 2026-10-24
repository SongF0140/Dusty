import assert from "node:assert/strict";
import test from "node:test";
import {
	compatibleSummaryGenerator,
	createSummaryService,
	SUMMARY_VERSION,
	summaryFingerprint,
} from "./blog-summary.ts";
import * as summaryModule from "./blog-summary.ts";

const post = {
	id: "git",
	title: "Git",
	body: "# 暂存\n\n撤销暂存保留工作区。",
	description: "原简介",
};

test("Intern MiniMax M3 summaries explicitly disable thinking while preserving the approved budget", async () => {
	for (const model of ["minimax-m3", "MiniMax-M3"]) {
		const generate = compatibleSummaryGenerator(
			{
				BLOG_LLM_BASE_URL: "https://discovery-api.intern-ai.org.cn/v1",
				BLOG_LLM_MODEL: model,
				BLOG_LLM_API_KEY: "test-only",
			},
			async (_url, init) => {
				const body = JSON.parse(init.body);
				assert.deepEqual(body.thinking, { type: "disabled" });
				assert.equal(body.max_tokens, 20000);
				assert.equal(body.model, model);
				return Response.json({
					choices: [
						{
							finish_reason: "stop",
							message: { content: "文章介绍聊天应用的会话管理与消息流。" },
						},
					],
				});
			},
		);
		assert.match(await generate("公开文章", true), /会话管理/);
	}
});

test("MiniMax M3.1 and unrelated models never receive M3-specific thinking settings", async () => {
	for (const [base, model] of [
		["https://discovery-api.intern-ai.org.cn/v1", "minimax-m3.1-flash"],
		["https://discovery-api.intern-ai.org.cn/v1", "other-model"],
		["https://model.invalid/v1", "minimax-m3"],
	]) {
		const generate = compatibleSummaryGenerator(
			{
				BLOG_LLM_BASE_URL: base,
				BLOG_LLM_MODEL: model,
				BLOG_LLM_API_KEY: "test-only",
			},
			async (_url, init) => {
				assert.equal(JSON.parse(init.body).thinking, undefined);
				return Response.json({
					choices: [{ message: { content: "公开摘要。" } }],
				});
			},
		);
		await generate("正文", true);
	}
});

test("Intern summary calls are paced below the 50 RPM quota", async (t) => {
	t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
	const starts = [];
	const generate = compatibleSummaryGenerator(
		{
			BLOG_LLM_BASE_URL: "https://discovery-api.intern-ai.org.cn/v1",
			BLOG_LLM_MODEL: "minimax-m3",
			BLOG_LLM_API_KEY: "test-only",
		},
		async () => {
			starts.push(Date.now());
			return Response.json({
				choices: [{ message: { content: "公开摘要。" } }],
			});
		},
	);
	await generate("第一段", false);
	const second = generate("第二段", false);
	await Promise.resolve();
	assert.deepEqual(starts, [0]);
	t.mock.timers.tick(1249);
	await Promise.resolve();
	assert.deepEqual(starts, [0]);
	t.mock.timers.tick(1);
	await second;
	assert.deepEqual(starts, [0, 1250]);
});

test("summary requests use a bounded 300-second deadline and identify timeouts", async () => {
	assert.equal(summaryModule.SUMMARY_REQUEST_TIMEOUT_MS, 300000);
	const generate = compatibleSummaryGenerator(
		{
			BLOG_LLM_BASE_URL: "https://model.invalid/v1",
			BLOG_LLM_MODEL: "chosen",
			BLOG_LLM_API_KEY: "secret",
		},
		async () => {
			throw new DOMException("private connection details", "TimeoutError");
		},
	);
	await assert.rejects(
		generate("正文", true),
		(error) =>
			error.code === "request_timeout" && !String(error).includes("private"),
	);
});

test("summary calls allow the approved 20000-token budget and reject truncated text", async () => {
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
	assert.equal(budget, 20000);
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
