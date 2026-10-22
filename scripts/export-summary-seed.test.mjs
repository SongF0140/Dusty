import assert from "node:assert/strict";
import test from "node:test";
import { summaryFingerprint } from "../src/server/blog-summary.ts";
import { createExistingSummarySeed } from "./export-summary-seed.ts";

test("exports existing descriptions verbatim, quotes SQL literals and never overwrites existing rows", () => {
	const result = createExistingSummarySeed(
		[{ id: "it's", url: "/posts/its/", description: "简介's \\ 原文" }],
		[{ id: "it's", body: "\n原正文\r\n" }],
	);
	assert.equal(result.count, 1);
	assert.ok(result.sql.includes("简介''s \\ 原文"));
	assert.ok(result.sql.includes(summaryFingerprint({ body: "原正文" })));
	assert.match(result.sql, /ON CONFLICT \(post_id\) DO NOTHING/);
	assert.ok(!result.sql.includes("原正文"));
});
test("rejects missing bodies and excludes non-public entries from the seed", () => {
	assert.throws(() =>
		createExistingSummarySeed(
			[{ id: "a", url: "/posts/a/", description: "简介" }],
			[],
		),
	);
	assert.equal(
		createExistingSummarySeed(
			[
				{
					id: "private",
					url: "/posts/private/",
					description: "秘密",
					password: "x",
				},
			],
			[],
		).count,
		0,
	);
});
