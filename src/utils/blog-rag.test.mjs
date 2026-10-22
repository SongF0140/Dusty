import assert from "node:assert/strict";
import test from "node:test";
import { retrieveBlogArticles, selectPublicPosts } from "./blog-rag.ts";

const articles = ["git", "中文", "sql", "docker"].map((id) => ({
	id,
	title: `文章 ${id}`,
	url: `/posts/${id}/`,
	bodyUrl: `/api/terminal-posts/${id}/index.json`,
	description: "",
	tags: [],
	category: "",
	published: "2026-10-20T00:00:00.000Z",
	updated: null,
}));
const hit = (url) => ({ data: async () => ({ url }) });
const search =
	(...urls) =>
	async () => ({ results: urls.map(hit) });
const fetchBody = async () =>
	new Response(JSON.stringify({ body: "完整正文\n前提与例外。" }));

test("public corpus excludes drafts and password posts even in development", () => {
	const post = (id, data = {}) => ({ id, data });
	assert.deepEqual(
		selectPublicPosts([
			post("public"),
			post("draft", { draft: true }),
			post("locked", { password: "secret" }),
		]).map((p) => p.id),
		["public"],
	);
});

test("preserves search order, matches encoded URLs, deduplicates and loads at most three full articles", async () => {
	const loaded = [];
	const result = await retrieveBlogArticles("如何使用 Git？", articles, {
		search: search(
			"/about/",
			"/posts/%E4%B8%AD%E6%96%87/",
			"/posts/中文/",
			"/posts/git/",
			"/posts/sql/",
			"/posts/docker/",
		),
		fetch: async (url) => {
			loaded.push(url);
			return fetchBody();
		},
	});
	assert.deepEqual(
		result.articles.map((p) => p.id),
		["中文", "git", "sql"],
	);
	assert.equal(loaded.length, 3);
	assert.equal(result.articles[0].body, "完整正文\n前提与例外。");
	assert.match(result.context, /\/posts\/中文\//);
	assert.match(result.context, /2026-10-20/);
	assert.match(result.context, /前提与例外/);
});

test("empty questions and unmatched results provide no invented context or body requests", async () => {
	let searches = 0;
	const deps = {
		search: async () => {
			searches++;
			return { results: [hit("/about/")] };
		},
		fetch: async () => {
			assert.fail("must not fetch unrelated posts");
		},
	};
	assert.equal((await retrieveBlogArticles("  ", articles, deps)).context, "");
	assert.equal(searches, 0);
	assert.equal(
		(await retrieveBlogArticles("天气", articles, deps)).context,
		"",
	);
});

test("body HTTP and payload errors are surfaced", async () => {
	for (const response of [
		new Response("error", { status: 503 }),
		new Response('{"body":123}'),
	]) {
		await assert.rejects(
			retrieveBlogArticles("git", articles, {
				search: search("/posts/git/"),
				fetch: async () => response,
			}),
		);
	}
});

test("budget never silently truncates an article and includes source metadata in its size", async () => {
	const result = await retrieveBlogArticles(
		"git sql",
		articles,
		{
			search: search("/posts/git/", "/posts/sql/"),
			fetch: async (url) =>
				new Response(
					JSON.stringify({
						body: url.includes("git") ? "长".repeat(1000) : "短正文",
					}),
				),
		},
		{ maxContextChars: 700 },
	);
	assert.deepEqual(
		result.articles.map((a) => a.id),
		["sql"],
	);
	assert.deepEqual(
		result.omitted.map((a) => a.id),
		["git"],
	);
	assert.ok(result.context.length <= 700);
	assert.match(result.context, /短正文/);
});

test("retrieves a matching late section without sending an entire long article", async () => {
	const body = `# 背景\n\n${"这是背景材料。".repeat(2000)}\n\n## 撤销暂存\n\ngit restore --staged 保留工作区。`;
	const result = await retrieveBlogArticles("restore staged", articles, {
		search: search("/posts/git/"),
		fetch: async () => Response.json({ body }),
	});
	assert.equal(result.articles.length, 1);
	assert.match(result.context, /restore --staged/);
	assert.ok(result.context.length < 10000);
	assert.ok(!result.context.includes("这是背景材料。".repeat(1000)));
});
