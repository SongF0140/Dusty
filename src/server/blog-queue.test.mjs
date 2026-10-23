import assert from "node:assert/strict";
import test from "node:test";
import { BlogQueue, runQueueJob } from "./blog-queue.ts";
import { DatabaseSync } from "node:sqlite";

test("quota includes reservations once and stays isolated when pending work starts", async () => {
	const db = new DatabaseSync(":memory:");
	db.exec(`CREATE TABLE blog_usage(user_id text,day text,used integer);
	CREATE TABLE blog_queue(user_id text,request_id text,day text,status text);
	CREATE TABLE blog_runs(user_id text,request_id text);
	INSERT INTO blog_usage VALUES('12','2026-10-23',18);
	INSERT INTO blog_queue VALUES('12','p','2026-10-23','pending'),('12','r','2026-10-23','running');
	INSERT INTO blog_runs VALUES('12','r');`);
	const queue = new BlogQueue(async (sql, values) => db.prepare(sql).all({ $1: values[0], $2: values[1] }));
	const now = new Date('2026-10-23T10:00:00Z');
	assert.equal((await queue.quota('12',now)).remaining,1);
	assert.equal((await queue.quota('99',now)).remaining,20);
	db.exec("UPDATE blog_queue SET status='running' WHERE request_id='p'");
	assert.equal((await queue.quota('12',now)).remaining,1);
	db.exec("INSERT INTO blog_runs VALUES('12','p'); UPDATE blog_usage SET used=19 WHERE user_id='12'");
	assert.equal((await queue.quota('12',now)).remaining,1);
	assert.equal((await queue.quota('12',new Date('2026-10-23T16:00:00Z'))).remaining,20);
	db.close();
});

test("daily quota reads only the requested account and rolls over at Shanghai midnight", async () => {
	const bindings = [];
	const queue = new BlogQueue(async (sql, values) => {
		bindings.push(values);
		assert.match(sql, /blog_usage/);
		assert.match(sql, /blog_queue/);
		return [{ used: values[0] === "12" ? 7 : 0 }];
	});
	const before = await queue.quota("12", new Date("2026-10-23T15:59:59Z"));
	const after = await queue.quota("99", new Date("2026-10-23T16:00:00Z"));
	assert.equal(before.remaining, 13);
	assert.equal(before.resetsAt, "2026-10-23T16:00:00.000Z");
	assert.equal(after.remaining, 20);
	assert.deepEqual(bindings, [["12", "2026-10-23"], ["99", "2026-10-24"]]);
});

test("queue input and polling are bound to the verified account", async () => {
	const calls = [];
	const queue = new BlogQueue(async (sql, values) => {
		calls.push({ sql, values });
		return [{ value: "pending" }];
	});
	await queue.enqueue({
		identity: { provider: "github", id: "12" },
		requestId: "r1",
		conversationId: "c1",
		question: "Git's rollback",
	});
	assert.equal(calls[0].values[0], "12");
	assert.ok(!calls[0].sql.includes("Git's"));
	await queue.status("12", "r1");
	assert.deepEqual(calls[1].values, ["12", "r1"]);
});
test("running job completes before the next job is woken, and only one is run per invocation", async () => {
	const order = [];
	const job = {
		userId: "12",
		requestId: "r1",
		leaseId: "lease",
		payload: { question: "A" },
	};
	const queue = {
		claim: async () => {
			order.push("claim");
			return job;
		},
		finish: async () => {
			order.push("finish");
		},
	};
	await runQueueJob(
		queue,
		async () => {
			order.push("answer");
			return { answer: "A" };
		},
		async () => {
			order.push("wake");
		},
	);
	assert.deepEqual(order, ["claim", "answer", "finish", "wake"]);
});

test("provider quota failure is stored as an actionable failure and never silently retried", async () => {
	const job = {
		userId: "12",
		requestId: "r",
		leaseId: "l",
		payload: { question: "你好" },
	};
	let attempts = 0;
	let stored;
	await runQueueJob(
		{
			claim: async () => job,
			finish: async (...args) => {
				stored = args;
			},
		},
		async () => {
			attempts++;
			throw new Error("模型服务额度不足或触发限流，请博主检查供应商余额。");
		},
		async () => {},
	);
	assert.equal(attempts, 1);
	assert.equal(stored[1], null);
	assert.match(stored[2], /模型服务额度不足或触发限流/);
});
