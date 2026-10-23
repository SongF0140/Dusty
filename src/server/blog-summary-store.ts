import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SummaryRecord, SummaryStore } from "./blog-summary.ts";

export function fileSummaryStore(path: string): SummaryStore {
	let entries: Record<string, SummaryRecord> | undefined;
	let writing: Promise<unknown> = Promise.resolve();
	const load = async () => {
		if (entries) return entries;
		try {
			entries = JSON.parse(await readFile(path, "utf8"));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			entries = {};
		}
		return entries ?? {};
	};
	return {
		async get(id) {
			return (await load())[id];
		},
		async put(id, record) {
			const next = writing.then(async () => {
				const data = await load();
				data[id] = record;
				await mkdir(dirname(path), { recursive: true });
				const temp = `${path}.${randomUUID()}.tmp`;
				await writeFile(temp, JSON.stringify(data, null, 2));
				await rename(temp, path);
			});
			writing = next.catch(() => undefined);
			await next;
		},
	};
}

export type SummaryQuery = (
	sql: string,
	values: unknown[],
) => Promise<Record<string, unknown>[]>;
export function postgresSummaryStore(query: SummaryQuery): SummaryStore {
	return {
		async get(id) {
			const rows = await query(
				"SELECT content_hash,summary,source,model,summary_version FROM blog_post_summaries WHERE post_id=$1",
				[id],
			);
			const row = rows[0];
			if (!row) return undefined;
			return {
				contentHash: String(row.content_hash),
				summary: String(row.summary),
				source: row.source === "model" ? "model" : "manual",
				...(typeof row.model === "string" ? { model: row.model } : {}),
				...(typeof row.summary_version === "string"
					? { summaryVersion: row.summary_version }
					: {}),
			};
		},
		async put(id, record) {
			await query(
				"INSERT INTO blog_post_summaries(post_id,content_hash,summary,source,model,summary_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(post_id) DO UPDATE SET content_hash=excluded.content_hash,summary=excluded.summary,source=excluded.source,model=excluded.model,summary_version=excluded.summary_version,updated_at=now()",
				[
					id,
					record.contentHash,
					record.summary,
					record.source,
					record.model ?? null,
					record.summaryVersion ?? null,
				],
			);
		},
	};
}
