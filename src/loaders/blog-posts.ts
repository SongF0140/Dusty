import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { glob, type Loader } from "astro/loaders";
import {
	compatibleSummaryGenerator,
	createSummaryService,
	SUMMARY_VERSION,
	type SummaryStore,
} from "../server/blog-summary.ts";
import {
	fileSummaryStore,
	postgresSummaryStore,
} from "../server/blog-summary-store.ts";

/** Enrich parsed collection descriptions, including changes observed by Astro's glob watcher. */
export function blogPostsLoader(
	options: {
		source?: Loader;
		env?: Record<string, string | undefined>;
		store?: SummaryStore;
		fetch?: typeof fetch;
	} = {},
): Loader {
	const base =
		options.source ??
		glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" });
	return {
		name: "blog-posts-with-model-summary",
		async load(context) {
			const env = options.env ?? { ...import.meta.env, ...process.env };
			const configured = Boolean(
				env.BLOG_LLM_BASE_URL &&
					env.BLOG_LLM_MODEL &&
					env.BLOG_LLM_API_KEY &&
					env.BLOG_SUMMARY_ENABLED !== "false",
			);
			const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL;
			const sql = databaseUrl ? neon(databaseUrl) : undefined;
			const store =
				options.store ??
				(sql
					? postgresSummaryStore((text, values) => sql.query(text, values))
					: fileSummaryStore(
							fileURLToPath(
								new URL("cache/blog-summaries-v2.json", context.config.root),
							),
						));
			const service = createSummaryService({
				store,
				model: `${env.BLOG_LLM_BASE_URL}|${env.BLOG_LLM_MODEL}`,
				generate: configured
					? compatibleSummaryGenerator(
							{
								BLOG_LLM_BASE_URL: env.BLOG_LLM_BASE_URL,
								BLOG_LLM_MODEL: env.BLOG_LLM_MODEL,
								BLOG_LLM_API_KEY: env.BLOG_LLM_API_KEY,
							},
							options.fetch,
						)
					: undefined,
			});
			context.logger.info(
				sql
					? "摘要存储：Neon Postgres；现有简介原样入库，正文变化后更新。"
					: "摘要存储：本地文件；现有简介原样保留。",
			);
			if (!configured)
				context.logger.info(
					"保留并入库现有简介；正文变化后需启用模型才能生成新摘要。",
				);
			await base.load({
				...context,
				generateDigest: (data) =>
					context.generateDigest(
						JSON.stringify([
							data,
							SUMMARY_VERSION,
							createHash("sha256")
								.update(databaseUrl || "local")
								.digest("hex"),
							configured,
							env.BLOG_LLM_BASE_URL,
							env.BLOG_LLM_MODEL,
						]),
					),
				async parseData(options) {
					const data = options.data;
					if (options.filePath && !data.draft && !data.password) {
						const raw = await readFile(options.filePath, "utf8");
						const body = raw.replace(
							/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
							"",
						);
						try {
							const record = await service.resolve({
								id: options.id,
								title: String(data.title),
								body,
								description:
									typeof data.description === "string" ? data.description : "",
							});
							return context.parseData({
								...options,
								data: {
									...data,
									description: record.summary,
									summaryGenerated: record.source === "model",
								},
							});
						} catch {
							throw new Error(
								`文章 ${options.id} 的模型摘要生成失败，请检查服务和摘要缓存迁移；未使用旧摘要。`,
							);
						}
					}
					return context.parseData({ ...options, data });
				},
			});
		},
	};
}
