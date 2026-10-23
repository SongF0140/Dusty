import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	fileSummaryStore,
	postgresSummaryStore,
} from "./blog-summary-store.ts";

test("disk summaries preserve both original descriptions and their body baseline across reopening", async () => {
	const directory = await mkdtemp(join(tmpdir(), "blog-summary-"));
	try {
		const path = join(directory, "summaries.json");
		const store = fileSummaryStore(path);
		await Promise.all([
			store.put("a", {
				contentHash: "a".repeat(64),
				summary: "摘要甲",
				source: "manual",
			}),
			store.put("b", {
				contentHash: "b".repeat(64),
				summary: "摘要乙",
				source: "model",
				model: "chosen",
			}),
		]);
		const reopened = fileSummaryStore(path);
		assert.deepEqual(await reopened.get("a"), {
			contentHash: "a".repeat(64),
			summary: "摘要甲",
			source: "manual",
		});
		assert.deepEqual(await reopened.get("b"), {
			contentHash: "b".repeat(64),
			summary: "摘要乙",
			source: "model",
			model: "chosen",
		});
		assert.equal(await reopened.get("missing"), undefined);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
test("Neon summary cache uses bound parameters and content-specific keys", async () => {
	const calls = [];
	const store = postgresSummaryStore(async (sql, values) => {
		calls.push({ sql, values });
		return [
			{
				content_hash: "sha",
				summary: "已缓存摘要",
				source: "manual",
				model: null,
			},
		];
	});
	assert.deepEqual(await store.get("article's-id"), {
		contentHash: "sha",
		summary: "已缓存摘要",
		source: "manual",
	});
	await store.put("article's-id", {
		contentHash: "sha",
		summary: "'摘要'",
		source: "manual",
	});
	assert.deepEqual(calls[0].values, ["article's-id"]);
	assert.ok(!calls[1].sql.includes("'摘要'"));
	assert.deepEqual(calls[1].values, [
		"article's-id",
		"sha",
		"'摘要'",
		"manual",
		null,
		null,
	]);
});
