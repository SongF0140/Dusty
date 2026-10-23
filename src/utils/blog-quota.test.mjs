import assert from "node:assert/strict";
import test from "node:test";
import { BlogQuotaCounter, readBlogQuota } from "./blog-quota.ts";

test("unknown or invalid quota never pretends to be twenty remaining", () => {
	const quota = {
		limit: 20,
		used: 7,
		remaining: 13,
		day: "2026-10-23",
		resetsAt: "2026-10-23T16:00:00Z",
	};
	assert.deepEqual(readBlogQuota(quota), quota);
	for (const value of [
		null,
		{},
		{ ...quota, remaining: 20 },
		{ ...quota, used: -1 },
		{ ...quota, resetsAt: "invalid" },
	])
		assert.equal(readBlogQuota(value), null);
});

const snapshot = (used) => ({
	limit: 20,
	used,
	remaining: 20 - used,
	day: "2026-10-23",
	resetsAt: "2026-10-23T16:00:00Z",
});

test("sending reserves quota immediately and serial acknowledgements do not double charge", () => {
	const counter = new BlogQuotaCounter();
	counter.sync(snapshot(12));
	const before = counter.version;
	counter.reserve("a");
	assert.equal(counter.current.remaining, 7);
	assert.ok(
		counter.version > before,
		"a pending refresh must become stale on send",
	);
	counter.reserve("a");
	assert.equal(
		counter.current.remaining,
		7,
		"the same request reserves only once",
	);
	counter.reserve("b");
	assert.equal(counter.current.remaining, 6);
	counter.sync(snapshot(13), "a");
	assert.equal(
		counter.current.remaining,
		6,
		"server includes a while b is still local",
	);
	counter.sync(snapshot(14), "b");
	assert.equal(counter.current.remaining, 6);
	assert.equal(counter.hasReservations, false);
	counter.release("a");
	assert.equal(
		counter.current.remaining,
		6,
		"finishing an acknowledged answer cannot refund it",
	);
});

test("failed local sends and uncharged guidance release only their own reservation", () => {
	const counter = new BlogQuotaCounter();
	counter.sync(snapshot(12));
	counter.reserve("a");
	counter.reserve("b");
	counter.release("b");
	assert.equal(counter.current.remaining, 7);
	counter.sync(snapshot(12), "a");
	assert.equal(
		counter.current.remaining,
		8,
		"server confirmed guidance is free",
	);
	counter.reserve("c");
	counter.clearReservations();
	assert.equal(counter.current.remaining, 8);
});

test("quota reservations stay isolated, clamp at zero and never invent an unknown quota", () => {
	const first = new BlogQuotaCounter();
	const second = new BlogQuotaCounter();
	first.reserve("a");
	assert.equal(first.current, null);
	first.sync(snapshot(19));
	second.sync(snapshot(0));
	assert.equal(first.current.remaining, 0);
	first.reserve("b");
	assert.equal(first.current.remaining, 0);
	assert.equal(second.current.remaining, 20);
	first.sync(null, "a");
	assert.equal(first.current, null);
});
