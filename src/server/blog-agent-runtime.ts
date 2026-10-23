import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import {
	BlogAgent,
	BlogCatalog,
	type BlogPost,
	compatibleModel,
	PostgresRunStore,
} from "../../vendor/starrylin/agent.mjs";
import { sanitizeAssistantAnswer } from "../utils/blog-assistant-policy.ts";
import {
	ARTICLE_READING_INVITATION,
	needsArticleClarification,
} from "../utils/blog-reading-context.ts";
import { streamingBlogModel } from "./blog-agent-stream.ts";
import {
	authConfigured,
	type BlogAuthEnv,
	signBlogToken,
	siteOrigin,
} from "./blog-auth.ts";
import { modelFailureMessage, observeModelFetch } from "./blog-diagnostics.ts";
import { blogModelFetch } from "./blog-model-fetch.ts";
import { BlogQueue, type QueueInput } from "./blog-queue.ts";

export function runtimeConfigured(env: BlogAuthEnv) {
	return (
		authConfigured(env) &&
		Boolean(
			(env.DATABASE_URL || env.POSTGRES_URL) &&
				env.BLOG_LLM_BASE_URL &&
				env.BLOG_LLM_MODEL &&
				env.BLOG_LLM_API_KEY,
		)
	);
}
export function createBlogRuntime(
	env: BlogAuthEnv,
	fetcher: typeof fetch = fetch,
) {
	const sql = neon(env.DATABASE_URL || env.POSTGRES_URL || "");
	const query = (text: string, values: unknown[]) => sql.query(text, values);
	const queue = new BlogQueue(query);
	let catalogPromise: Promise<BlogCatalog> | undefined;
	const catalog = () =>
		(catalogPromise ??= (async () => {
			const [metadata, bodies] = await Promise.all(
				["articles", "corpus"].map(async (name) =>
					JSON.parse(
						await readFile(
							join(process.cwd(), `dist/api/rag/${name}.json`),
							"utf8",
						),
					),
				),
			);
			const bodyMap = new Map<string, string>(
				bodies.map((item: { id: string; body: string }) => [
					item.id,
					item.body,
				]),
			);
			return new BlogCatalog(
				metadata.map((item: Omit<BlogPost, "body">) => ({
					...item,
					body: bodyMap.get(item.id) || "",
				})),
			);
		})());
	return {
		queue,
		catalog,
		async ask(input: QueueInput, onText: (text: string) => void = () => {}) {
			let modelFailure: string | undefined;
			const posts = await catalog();
			if (
				needsArticleClarification(
					input.question,
					input.articleIds || [],
					posts.list(),
				)
			) {
				onText(ARTICLE_READING_INVITATION);
				return {
					answer: ARTICLE_READING_INVITATION,
					sources: [],
					modelCalls: 0,
					toolCalls: 0,
				};
			}
			const selected = posts
				.list()
				.filter((post) => input.articleIds?.includes(post.id));
			const selectedContext = selected.length
				? `\n\n用户当前选中的公开博文：${selected.map((post) => `${post.title}（${post.id}）`).join("、")}`
				: "\n\n当前未选中博文。若问‘这篇文章’等指代不明的问题，应先邀请用户进入博文或提供标题。有明确主题的知识问题可正常检索，但不能把检索到的第一篇擅自当作当前文章。";
			const question =
				input.question +
				selectedContext.slice(0, Math.max(0, 4000 - input.question.length));
			const configured = compatibleModel({
				baseUrl: env.BLOG_LLM_BASE_URL || "",
				model: env.BLOG_LLM_MODEL || "",
				apiKey: env.BLOG_LLM_API_KEY || "",
				fetch: observeModelFetch(blogModelFetch(fetcher), (code, status) => {
					modelFailure = code;
					console.warn(
						"Blog model rejection",
						JSON.stringify({ code, status }),
					);
				}),
			});
			const agent = new BlogAgent({
				catalog: posts,
				store: new PostgresRunStore(query),
				...configured,
				streamFn: streamingBlogModel(configured.streamFn, (text) =>
					onText(
						sanitizeAssistantAnswer(
							text,
							posts.list().map((post) => post.url),
						),
					),
				),
			});
			try {
				return await agent.ask({ ...input, question });
			} catch (error) {
				if (modelFailure) throw new Error(modelFailureMessage(modelFailure));
				throw error;
			}
		},
		async wake() {
			// Production deployment URLs may require Vercel SSO; the public site
			// routes to the same worker, which still requires its signed token.
			const origin =
				env.VERCEL_ENV !== "production" && env.VERCEL_URL
					? `https://${env.VERCEL_URL}`
					: siteOrigin(env);
			const headers: Record<string, string> = {
				Authorization: `Bearer ${signBlogToken({ purpose: "worker", exp: Date.now() + 60000 }, env)}`,
			};
			if (env.VERCEL_AUTOMATION_BYPASS_SECRET)
				headers["x-vercel-protection-bypass"] =
					env.VERCEL_AUTOMATION_BYPASS_SECRET;
			const response = await fetcher(`${origin}/api/blog-worker`, {
				method: "POST",
				headers,
				signal: AbortSignal.timeout(8000),
			});
			if (!response.ok) throw new Error("队列唤醒失败，将在下一次轮询时重试");
		},
	};
}
