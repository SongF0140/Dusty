import assert from "node:assert/strict";
import test from "node:test";
import { handleBlogChat } from "./blog-chat.ts";

const article = {
	id: "git",
	title: "Git 笔记",
	url: "/posts/git/",
	bodyUrl: "/api/terminal-posts/git/index.json",
	published: "2026-10-20",
	updated: null,
};
const env = {
	BLOG_LLM_BASE_URL: "https://model.example/v1",
	BLOG_LLM_MODEL: "chosen-model",
	BLOG_LLM_API_KEY: "test-secret",
};
const request = (body = { question: "git 如何撤销", articleIds: ["git"] }) =>
	new Request("https://blog.example/api/blog-chat", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: "https://blog.example",
		},
		body: JSON.stringify(body),
	});
const assets = async (path) =>
	Response.json(
		path.includes("articles.json")
			? [article]
			: { body: "只有暂存区变更时使用 git restore --staged。" },
	);

test("server reads trusted article bodies and sends configured compatible request with sources", async () => {
	let calls = 0;
	const response = await handleBlogChat(request(), env, {
		assets,
		fetch: async (url, init) => {
			calls++;
			assert.equal(url, "https://model.example/v1/chat/completions");
			assert.equal(init.headers.Authorization, "Bearer test-secret");
			const body = JSON.parse(init.body);
			assert.equal(body.model, "chosen-model");
			assert.match(body.messages.at(-1).content, /git restore --staged/);
			return Response.json({
				choices: [
					{ message: { content: "可以撤销暂存。[Git 笔记](/posts/git/)" } },
				],
			});
		},
	});
	assert.equal(response.status, 200);
	const data = await response.json();
	assert.equal(calls, 1);
	assert.equal(data.sources[0].url, "/posts/git/");
	assert.ok(!JSON.stringify(data).includes("test-secret"));
});

test("unknown article IDs fail before calling the model", async () => {
	const response = await handleBlogChat(
		request({ question: "问题", articleIds: ["secret"] }),
		env,
		{
			assets,
			fetch: async () => assert.fail("must not call model"),
		},
	);
	assert.equal(response.status, 400);
});

test("greetings, reading guidance and no-evidence knowledge questions reach the model with the right boundaries", async () => {
	for (const question of ["你好呀！", "推荐几篇入门文章", "什么是量子计算？"]) {
		const response = await handleBlogChat(
			request({ question, articleIds: [] }),
			env,
			{
				assets,
				fetch: async (_url, init) => {
					const messages = JSON.parse(init.body).messages;
					assert.match(messages[0].content, /寒暄/);
					assert.match(messages[0].content, /扩展说明/);
					assert.match(messages[0].content, /外部链接/);
					if (question.includes("推荐"))
						assert.match(messages.at(-1).content, /Git 笔记/);
					return Response.json({
						choices: [
							{
								message: {
									content: "你好，可以聊聊。[外链](https://outside.example)",
								},
							},
						],
					});
				},
			},
		);
		assert.equal(response.status, 200);
		const data = await response.json();
		assert.deepEqual(data.sources, []);
		assert.ok(!data.answer.includes("outside.example"));
		if (question.includes("量子")) assert.match(data.answer, /【扩展说明】/);
		else assert.ok(!data.answer.includes("【扩展说明】"));
	}
});

test("missing config, invalid requests and cross-origin submissions fail before paid requests", async () => {
	const deps = {
		assets,
		fetch: async () => assert.fail("must not call model"),
	};
	assert.equal((await handleBlogChat(request(), {}, deps)).status, 503);
	assert.equal(
		(await handleBlogChat(request({ question: "", articleIds: [] }), env, deps))
			.status,
		400,
	);
	const crossOrigin = request();
	crossOrigin.headers.set("Origin", "https://other.example");
	assert.equal((await handleBlogChat(crossOrigin, env, deps)).status, 403);
});

test("upstream failures are sanitized and oversized evidence is explicitly reported", async () => {
	const failed = await handleBlogChat(request(), env, {
		assets,
		fetch: async () =>
			new Response("test-secret upstream details", { status: 401 }),
	});
	assert.equal(failed.status, 502);
	assert.ok(!(await failed.text()).includes("test-secret"));
	const large = await handleBlogChat(request(), env, {
		assets: async (path) =>
			Response.json(
				path.includes("articles.json")
					? [article]
					: { body: "大".repeat(50_000) },
			),
		fetch: async () => assert.fail("must not call model"),
	});
	assert.equal(large.status, 422);
});
