import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { splitSqlCommands } from "./blog-migrations.ts";

test("preserves function bodies and quoted semicolons as single prepared statements", () => {
	const commands = splitSqlCommands(
		"BEGIN; CREATE FUNCTION x() RETURNS void AS $$ BEGIN PERFORM ';'; END; $$ LANGUAGE plpgsql; SELECT 'it''s;ok'; COMMIT;",
	);
	assert.equal(commands.length, 2);
	assert.match(commands[0], /PERFORM ';'/);
	assert.match(commands[1], /it''s;ok/);
});
test("bundled agent and queue migrations split into executable standalone commands", async () => {
	const commands = splitSqlCommands(
		await readFile("migrations/004-blog-agent.sql", "utf8"),
	).concat(
		splitSqlCommands(await readFile("migrations/005-blog-queue.sql", "utf8")),
	);
	assert.equal(
		commands.filter((sql) => sql.startsWith("CREATE OR REPLACE FUNCTION"))
			.length,
		6,
	);
	assert.ok(commands.every((sql) => sql.startsWith("CREATE")));
});
