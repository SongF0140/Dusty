import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { splitSqlCommands } from "../src/server/blog-migrations.ts";

const database = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!database)
	console.log(
		"Agent migration skipped: DATABASE_URL is not configured; paid chat stays disabled.",
	);
else {
	const sql = neon(database);
	const commands = (
		await Promise.all(
			["004-blog-agent.sql", "005-blog-queue.sql"].map(async (name) =>
				splitSqlCommands(
					await readFile(
						new URL(`../migrations/${name}`, import.meta.url),
						"utf8",
					),
				),
			),
		)
	).flat();
	try {
		await sql.transaction(commands.map((command) => sql.query(command)));
		console.log("Agent and queue schema ready; existing summaries unchanged.");
	} catch {
		throw new Error(
			"Agent schema setup failed. Check the server database connection and schema permissions.",
		);
	}
}
