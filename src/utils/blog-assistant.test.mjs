import assert from "node:assert/strict";
import test from "node:test";
import { askBlogAssistant, blogQueryTerms } from "./blog-assistant.ts";

const corpus = [
	{
		id: "git",
		title: "Git",
		url: "/posts/git/",
		bodyUrl: "/api/terminal-posts/git/index.json",
		published: "2026-10-20",
		updated: null,
	},
];

test("retrieval strips conversational filler but preserves technical terms", () => {
	const terms = blogQueryTerms("请介绍一下 Git 如何撤销提交？");
	assert.ok(terms.includes("git"));
	assert.ok(!terms.includes("请"));
	assert.ok(!terms.includes("如何"));
});

test("current article questions select that article and send only trusted IDs, no browser supplied body", async () => {
	let payload;
	const result = await askBlogAssistant("这篇文章的核心观点是什么？", corpus, {
		pagePath: "/posts/git/",
		search: async () => assert.fail("current article needs no broad search"),
		fetch: async (_url, init) => {
			payload = JSON.parse(init.body);
			return Response.json({
				answer: "核心观点",
				sources: [{ title: "Git", url: "/posts/git/" }],
			});
		},
	});
	assert.deepEqual(payload.articleIds, ["git"]);
	assert.equal(payload.body, undefined);
	assert.match(result.content, /\[Git\]\(\/posts\/git\/\)/);
});

test("knowledge questions with no evidence reach the server for explicitly marked expansion", async () => {
	let payload;
	const result = await askBlogAssistant("weather", corpus, {
		pagePath: "/",
		search: async () => ({ results: [] }),
		fetch: async (_url, init) => {
			payload = JSON.parse(init.body);
			return Response.json({
				answer: "【扩展说明】这是博客之外的通用知识。",
				sources: [],
			});
		},
	});
	assert.deepEqual(payload.articleIds, []);
	assert.match(result.content, /扩展说明/);
});

test("greetings skip article search and still receive a model reply without external links", async () => {
	const result = await askBlogAssistant("你好呀！", corpus, {
		pagePath: "/",
		search: async () => assert.fail("greetings need no search"),
		fetch: async () =>
			Response.json({
				answer: "你好。[官网](https://outside.example) https://outside.example",
				sources: [],
			}),
	});
	assert.match(result.content, /你好/);
	assert.ok(!result.content.includes("outside.example"));
});

test("API failure is surfaced instead of becoming an assistant reply", async () => {
	await assert.rejects(
		askBlogAssistant("这篇文章", corpus, {
			pagePath: "/posts/git/",
			search: async () => ({ results: [] }),
			fetch: async () =>
				Response.json({ error: "模型服务不可用" }, { status: 502 }),
		}),
		/模型服务不可用/,
	);
});
