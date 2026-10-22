import assert from "node:assert/strict";
import test from "node:test";
import { BlogQueue, runQueueJob } from "./blog-queue.ts";

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
