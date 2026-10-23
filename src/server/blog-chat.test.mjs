import assert from "node:assert/strict";
import test from "node:test";
import { signBlogToken } from "./blog-auth.ts";
import { handleBlogChat } from "./blog-chat.ts";

const env = {
	BLOG_SITE_URL: "https://blog.test",
	BLOG_LLM_BASE_URL: "https://model.test/v1",
	BLOG_LLM_MODEL: "chosen",
	BLOG_LLM_API_KEY: "fake",
	DATABASE_URL: "postgresql://fake",
	BLOG_GITHUB_CLIENT_ID: "client",
	BLOG_GITHUB_CLIENT_SECRET: "secret",
	BLOG_SESSION_SECRET: "x".repeat(48),
};
const cookie = `blog_session=${signBlogToken({ purpose: "session", id: "12", login: "reader", exp: Date.now() + 60000 }, env)}`;
const request = (body, headers = { cookie, origin: "https://blog.test" }) =>
	new Request("https://blog.test/api/blog-chat", {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
const body = {
	requestId: "r1",
	conversationId: "c1",
	question: "Git",
	articleIds: ["git"],
	identity: { id: "forged" },
};
test("enqueues only the signed GitHub identity and returns before executing the agent", async () => {
	let input;
	const runtime = {
		queue: {
			enqueue: async (value) => {
				input = value;
				return "pending";
			},
		},
		catalog: async () => ({ list: () => [{ id: "git" }] }),
		wake: async () => {},
	};
	const response = await handleBlogChat(request(body), env, {
		runtime: () => runtime,
		defer: () => {},
	});
	assert.equal(response.status, 202);
	assert.equal(input.identity.id, "12");
	assert.equal(input.identity.provider, "github");
});
test("rejects anonymous, cross-origin, unknown articles and missing configuration before enqueue", async () => {
	const deps = {
		runtime: () => ({
			catalog: async () => ({ list: () => [] }),
			queue: { enqueue: () => assert.fail("no enqueue") },
		}),
		defer: () => {},
	};
	assert.equal(
		(await handleBlogChat(request(body, {}), env, deps)).status,
		401,
	);
	assert.equal(
		(
			await handleBlogChat(
				request(body, { cookie, origin: "https://outside.test" }),
				env,
				deps,
			)
		).status,
		403,
	);
	assert.equal((await handleBlogChat(request(body), env, deps)).status, 400);
	assert.equal((await handleBlogChat(request(body), {}, deps)).status, 503);
});
test("polling is account-scoped and quota errors are 429", async () => {
	const runtime = {
		queue: {
			status: async (user, id) => {
				assert.equal(user, "12");
				assert.equal(id, "r1");
				return { status: "completed", result: { answer: "回答", sources: [] } };
			},
			enqueue: async () => "quota",
		},
		catalog: async () => ({ list: () => [{ id: "git" }] }),
		wake: async () => {},
	};
	const deps = { runtime: () => runtime, defer: () => {} };
	const polled = await handleBlogChat(
		new Request("https://blog.test/api/blog-chat?requestId=r1", {
			headers: { cookie },
		}),
		env,
		deps,
	);
	assert.equal((await polled.json()).answer, "回答");
	assert.equal((await handleBlogChat(request(body), env, deps)).status, 429);
});

test("stream subscriptions require a session and only read that account's queued answer", async () => {
	const deps = {
		runtime: () => assert.fail("anonymous cannot open a stream"),
		defer: () => {},
	};
	assert.equal(
		(
			await handleBlogChat(
				new Request("https://blog.test/api/blog-chat?requestId=r1&stream=1"),
				env,
				deps,
			)
		).status,
		401,
	);
	let reads = 0;
	const response = await handleBlogChat(
		new Request("https://blog.test/api/blog-chat?requestId=r1&stream=1", {
			headers: { cookie },
		}),
		env,
		{
			runtime: () => ({
				queue: {
					status: async (user, id) => {
						assert.equal(user, "12");
						assert.equal(id, "r1");
						return ++reads === 1
							? { status: "running", partial_answer: "第一句" }
							: {
									status: "completed",
									result: { answer: "完成", sources: [] },
								};
					},
				},
				catalog: async () => ({ list: () => [] }),
				wake: async () => {},
			}),
			defer: () => {},
		},
	);
	assert.match(response.headers.get("content-type"), /text\/event-stream/);
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	assert.match(decoder.decode((await reader.read()).value), /第一句/);
	assert.match(decoder.decode((await reader.read()).value), /event: done/);
	await reader.cancel();
});
