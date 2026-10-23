import assert from "node:assert/strict";
import test from "node:test";
import {
	askBlogAssistant,
	blogQueryTerms,
	pollBlogAssistant,
} from "./blog-assistant.ts";

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

test("live text is rendered before the final SSE event, across split UTF-8 chunks", async () => {
	let finish;
	const gate = new Promise((resolve) => {
		finish = resolve;
	});
	const partials = [];
	const encoder = new TextEncoder();
	const result = pollBlogAssistant("r1", corpus, {
		onPartial(text) {
			partials.push(text);
			finish();
		},
		fetch: async (url) => {
			assert.match(url, /stream=1/);
			return new Response(
				new ReadableStream({
					async start(controller) {
						const bytes = encoder.encode(
							'event: update\ndata: {"answer":"你好"}\n\n',
						);
						controller.enqueue(bytes.slice(0, 35));
						controller.enqueue(bytes.slice(35));
						await gate;
						controller.enqueue(
							encoder.encode(
								'event: done\ndata: {"answer":"你好，完成了","sources":[]}\n\n',
							),
						);
						controller.close();
					},
				}),
				{ headers: { "content-type": "text/event-stream" } },
			);
		},
	});
	assert.equal((await result).content, "你好，完成了");
	assert.deepEqual(partials, ["你好"]);
});

test("server RAG questions do not wait for Pagefind to submit", async () => {
	await askBlogAssistant("Git 如何撤销？", corpus, {
		pagePath: "/",
		search: () => assert.fail("server owns retrieval"),
		fetch: async () => Response.json({ answer: "回答", sources: [] }),
	});
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

test("queued answers poll without resubmitting and accept only public source links", async () => {
	let posts = 0;
	let polls = 0;
	let enqueued = 0;
	const states = [];
	const result = await askBlogAssistant("你好", corpus, {
		pagePath: "/",
		requestId: "r1",
		conversationId: "c1",
		search: async () => ({ results: [] }),
		wait: async () => {},
		onStatus: (status) => states.push(status),
		onEnqueued: () => {
			enqueued++;
		},
		fetch: async (url, init) => {
			if (init?.method === "POST") {
				posts++;
				return Response.json(
					{ requestId: "r1", status: "pending" },
					{ status: 202 },
				);
			}
			assert.equal(url, "/api/blog-chat?requestId=r1");
			assert.equal(
				enqueued,
				1,
				"release the next submission before awaiting an answer",
			);
			polls++;
			return polls === 1
				? Response.json({ status: "running" })
				: Response.json({
						status: "completed",
						answer: "可以读读 Git。",
						sources: [
							{ title: "Git", url: "/posts/git/" },
							{ title: "外部", url: "https://outside.test" },
						],
					});
		},
	});
	assert.equal(posts, 1);
	assert.equal(enqueued, 1);
	assert.equal(polls, 2);
	assert.deepEqual(states, ["running"]);
	assert.match(result.content, /\/posts\/git\//);
	assert.ok(!result.content.includes("outside.test"));
});
