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
const quota = async () => ({ limit: 20, used: 1, remaining: 19, day: "2026-10-23", resetsAt: "2026-10-23T16:00:00.000Z" });
test("enqueues only the signed GitHub identity and returns before executing the agent", async () => {
	let input;
	const runtime = {
		queue: {
			quota,
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
			quota,
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

test("remaining quota is private to the signed visitor, never a browser-supplied identity", async () => {
	const seen = [];
	const deps = { runtime: () => ({ queue: { quota: async id => { seen.push(id); return { ...(await quota()), remaining: id === "12" ? 13 : 20 }; } } }), defer() {} };
	for (const id of ["12", "99"]) {
		const token = signBlogToken({ purpose: "session", id, login: "reader", exp: Date.now() + 60000 }, env);
		const response = await handleBlogChat(new Request("https://blog.test/api/blog-chat?identity=forged", { headers: { cookie: `blog_session=${token}` } }), env, deps);
		assert.equal((await response.json()).quota.remaining, id === "12" ? 13 : 20);
	}
	assert.deepEqual(seen, ["12", "99"]);
});

test("ambiguous homepage reading asks for a title without queuing a random post", async () => {
	const deps = { runtime: () => ({ queue: { quota, enqueue: () => assert.fail("must not queue ambiguous reading") }, catalog: async () => ({ list: () => [{ id: "git", title: "Git", url: "/posts/git/" }] }) }), defer() {} };
	const response = await handleBlogChat(request({ ...body, question: "陪我梳理一下这篇文章的主要内容吧。", articleIds: [], pagePath: "/" }), env, deps);
	assert.equal(response.status, 200);
	const data = await response.json();
	assert.match(data.answer, /标题|博文/);
	assert.equal(data.modelCalls, 0);
	assert.deepEqual(data.sources, []);
});

test('explicit titles and a real article page still enqueue, but homepage stale selection is ignored',async()=>{
    const queued=[];
    const deps={runtime:()=>({queue:{quota,enqueue:async item=>{queued.push(item);return 'pending';}},catalog:async()=>({list:()=>[{id:'git',title:'Git 撤销与回退',url:'/posts/git/'}]}),wake:async()=>{}}),defer(){}};
    const named=await handleBlogChat(request({...body,question:'这篇《Git 撤销与回退》讲什么？',articleIds:[],pagePath:'/'}),env,deps);
    assert.equal(named.status,202);
    const current=await handleBlogChat(request({...body,question:'这篇文章讲什么？',articleIds:['git'],pagePath:'/posts/git/'}),env,deps);
    assert.equal(current.status,202);
    assert.deepEqual(queued[1].articleIds,['git']);
    const stale=await handleBlogChat(request({...body,question:'这篇文章讲什么？',articleIds:['git'],pagePath:'/'}),env,deps);
    assert.equal(stale.status,200);
    assert.equal(queued.length,2);
});

test('a failed quota display lookup does not lose an accepted job or skip waking it',async()=>{
    let woke=false;
    const response=await handleBlogChat(request(body),env,{runtime:()=>({queue:{quota:async()=>{throw Error('offline');},enqueue:async()=> 'pending'},catalog:async()=>({list:()=>[{id:'git'}]}),wake:async()=>{woke=true;}}),defer(){}});
    assert.equal(response.status,202);
    assert.equal((await response.json()).quota,null);
    assert.equal(woke,true);
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
