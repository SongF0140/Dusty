import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { summaryFingerprint } from "../src/server/blog-summary.ts";

interface Article {
	id: string;
	url: string;
	description?: string;
	draft?: boolean;
	password?: string;
}
export function createExistingSummarySeed(
	articles: Article[],
	corpus: { id: string; body: string }[],
) {
	const bodies = new Map(corpus.map((post) => [post.id, post.body]));
	const literal = (text: string) => {
		if (text.includes("\0")) throw new Error("SQL text cannot contain NUL");
		return `'${text.replace(/'/g, "''")}'`;
	};
	const rows = articles
		.filter((article) => !article.draft && !article.password)
		.map((article) => {
			const body = bodies.get(article.id);
			if (typeof body !== "string" || !article.url.startsWith("/posts/"))
				throw new Error(`Invalid public snapshot: ${article.id}`);
			return `(${literal(article.id)},${literal(summaryFingerprint({ body }))},${literal(article.description || "")},'manual')`;
		});
	return {
		count: rows.length,
		sql: rows.length
			? `INSERT INTO blog_post_summaries(post_id,content_hash,summary,source) VALUES\n${rows.join(",\n")}\nON CONFLICT (post_id) DO NOTHING;\n`
			: "-- No public descriptions to import.\n",
	};
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const [articles, corpus, migration] = await Promise.all([
		readFile(resolve(root, "dist/api/rag/articles.json"), "utf8"),
		readFile(resolve(root, "dist/api/rag/corpus.json"), "utf8"),
		readFile(
			resolve(root, "migrations/002-preserve-existing-summaries.sql"),
			"utf8",
		),
	]);
	const seed = createExistingSummarySeed(
		JSON.parse(articles),
		JSON.parse(corpus),
	);
	const target = resolve(root, "migrations/003-seed-existing-summaries.sql");
	await writeFile(
		target,
		`-- Generated from the current public build: ${seed.count} unchanged descriptions.\n-- No model calls. Safe to rerun: existing rows are never overwritten.\nBEGIN;\nSET LOCAL standard_conforming_strings=on;\n${migration}\n${seed.sql}COMMIT;\n`,
	);
	process.stdout.write(
		`Prepared ${seed.count} existing descriptions in migrations/003-seed-existing-summaries.sql\n`,
	);
}
