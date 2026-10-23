import { neon } from "@neondatabase/serverless";
import { modelFailureCode } from "../src/server/blog-diagnostics.ts";

// Runs where credentials already live. Output contains no identities, questions,
// answers, provider error text, connection strings, or credentials.
const database = process.env.DATABASE_URL || process.env.POSTGRES_URL;
console.log(
	"Blog model configuration",
	JSON.stringify({
		model: /^deepseek[a-z0-9._-]{0,80}$/i.test(process.env.BLOG_LLM_MODEL || "")
			? process.env.BLOG_LLM_MODEL
			: "custom-model-id",
		summaryEnabled: process.env.BLOG_SUMMARY_ENABLED !== "false",
	}),
);
if (database) {
	try {
		const sql = neon(database);
		const rows = await sql.query(`SELECT q.status, r.status AS run_status,
		 r.model_calls, r.tool_calls, length(q.result->>'answer') AS answer_chars,
		 (SELECT e.data::jsonb #>> '{message,errorMessage}' FROM blog_events e
		 WHERE e.user_id=q.user_id AND e.request_id=q.request_id AND e.type='turn_end'
		 ORDER BY e.seq DESC LIMIT 1) AS provider_error
		 FROM blog_queue q LEFT JOIN blog_runs r USING(user_id,request_id)
		 ORDER BY q.seq DESC LIMIT 8`);
		console.log(
			"Blog task diagnostics",
			JSON.stringify(
				rows.map((row) => ({
					status: row.status,
					runStatus: row.run_status,
					modelCalls: row.model_calls,
					toolCalls: row.tool_calls,
					answerChars: row.answer_chars,
					failure: row.provider_error
						? modelFailureCode(String(row.provider_error))
						: null,
				})),
			),
		);
	} catch {
		console.log(
			"Blog task diagnostics unavailable; no credentials or raw errors logged.",
		);
	}
}
