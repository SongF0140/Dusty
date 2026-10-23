import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { progressPublisher, streamingBlogModel } from "./blog-agent-stream.ts";
import { queueEventStream } from "./blog-event-stream.ts";
import { nodeReply } from "./blog-node-adapter.ts";
import { BlogQueue } from "./blog-queue.ts";

test("actual model deltas arrive before completion, with reasoning excluded and a fresh snapshot per round", async () => {
	const updates = [];
	let finish;
	const gate = new Promise((resolve) => {
		finish = resolve;
	});
	const stream = streamingBlogModel(
		async function* (_model, context) {
			assert.match(context.systemPrompt, /博客陪读助手 StarryLin/);
			yield { type: "thinking_delta", delta: "private reasoning" };
			yield { type: "text_delta", delta: "第一句" };
			await gate;
			yield { type: "text_delta", delta: "。" };
		},
		(text) => updates.push(text),
	);
	const iterator = stream({}, { systemPrompt: "你是博客陪读助手海问香。" }, {})[
		Symbol.asyncIterator
	]();
	await iterator.next();
	await iterator.next();
	assert.deepEqual(updates, ["", "第一句"]);
	finish();
	await iterator.next();
	assert.equal(updates.at(-1), "第一句。");
});

test("SSE exposes a partial answer before the completed answer without leaking external links", async () => {
	let release;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const response = queueEventStream(
		{ status: "running", partial_answer: "正在读 http://outside.test" },
		async () => ({
			status: "completed",
			result: { answer: "完成", sources: [] },
		}),
		[],
		{ wait: () => gate },
	);
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const first = decoder.decode((await reader.read()).value);
	assert.match(first, /event: update/);
	assert.ok(!first.includes("outside.test"));
	release();
	const second = decoder.decode((await reader.read()).value);
	assert.match(second, /event: done/);
	assert.match(second, /完成/);
	await reader.cancel();
});

test("modern Pi system messages keep tool declarations and policy while correcting the persona", async () => {
	const user = { role: "user", content: "海问香是文章里的角色" };
	const tools = [{ name: "read_post" }];
	const stream = streamingBlogModel(
		async function* (_model, context) {
			assert.equal(context.systemPrompt, undefined);
			assert.match(context.messages[0].content, /博客陪读助手 StarryLin/);
			assert.match(context.messages[0].content, /温柔与沉静/);
			assert.match(context.messages[0].content, /120至220/);
			assert.match(context.messages[0].content, /不提供外链/);
			assert.deepEqual(context.messages[0].toolsAdded, tools);
			assert.equal(context.messages[1], user);
			yield { type: "done" };
		},
		() => {},
	);
	for await (const _event of stream(
		{},
		{
			messages: [
				{
					role: "system",
					content: "你是博客陪读助手海问香。不提供外链。",
					toolsAdded: tools,
				},
				user,
			],
		},
		{},
	)) {
	}
});

test("Node adapter flushes SSE chunks before the response is closed", async () => {
	let controller;
	const writes = [];
	let ended = false;
	const response = new Response(
		new ReadableStream({
			start(value) {
				controller = value;
			},
		}),
		{ headers: { "content-type": "text/event-stream" } },
	);
	const replying = nodeReply(response, {
		setHeader() {},
		flushHeaders() {},
		write(chunk) {
			writes.push(new TextDecoder().decode(chunk));
			return true;
		},
		end() {
			ended = true;
		},
	});
	controller.enqueue(new TextEncoder().encode("data: first\n\n"));
	await new Promise((resolve) => setTimeout(resolve, 0));
	assert.equal(writes.length, 1);
	assert.equal(ended, false);
	controller.close();
	await replying;
	assert.equal(ended, true);
});

test("partial writes bind both the account and the active lease", async () => {
	let query;
	const queue = new BlogQueue(async (sql, values) => {
		query = { sql, values };
		return [];
	});
	await queue.progress(
		{ userId: "12", requestId: "r", leaseId: "lease" },
		"partial",
	);
	assert.deepEqual(query.values, ["12", "r", "lease", "partial"]);
	assert.match(query.sql, /lease_id=\$3/);
	assert.match(query.sql, /status='running'/);
});

test("progress writes coalesce token bursts and finish in order before job completion", async () => {
	let release;
	let started;
	const gate = new Promise((resolve) => {
		release = resolve;
	});
	const writing = new Promise((resolve) => {
		started = resolve;
	});
	const writes = [];
	const publisher = progressPublisher(async (text) => {
		writes.push(text);
		if (writes.length === 1) {
			started();
			await gate;
		}
	}, 1);
	publisher.update("A");
	await writing;
	publisher.update("AB");
	publisher.update("ABC");
	const flushed = publisher.flush();
	assert.deepEqual(writes, ["A"]);
	release();
	await flushed;
	assert.deepEqual(writes, ["A", "ABC"]);
});

test("disconnecting during backpressure releases the SSE function without cancelling the worker", async () => {
	const events = new EventEmitter();
	let controller;
	let ended = false;
	const replying = nodeReply(
		new Response(
			new ReadableStream({
				start(value) {
					controller = value;
				},
			}),
			{ headers: { "content-type": "text/event-stream" } },
		),
		{
			setHeader() {},
			write() {
				return false;
			},
			end() {
				ended = true;
			},
			once: events.once.bind(events),
			off: events.off.bind(events),
		},
	);
	controller.enqueue(new TextEncoder().encode("data: first\n\n"));
	await new Promise((resolve) => setTimeout(resolve, 0));
	events.emit("close");
	await Promise.race([
		replying,
		new Promise((_, reject) =>
			setTimeout(() => reject(Error("SSE remained blocked")), 100),
		),
	]);
	assert.equal(ended, true);
});
