import { type RagChunk, retrieveChunks, splitPost } from "./blog-rag-index.ts";

export type BlogArticle = {
	id: string;
	title: string;
	url: string;
	bodyUrl: string;
	description: string;
	tags: string[];
	category: string;
	published: string;
	updated: string | null;
};

export type BlogEvidence = BlogArticle & { body: string; chunks?: RagChunk[] };
export type ArticleSearch = (query: string) => Promise<{
	results: { data(): Promise<{ url: string }> }[];
}>;

export function selectPublicPosts<
	T extends { data: { draft?: boolean; password?: string } },
>(posts: T[]): T[] {
	return posts.filter((post) => !post.data.draft && !post.data.password);
}

function pathKey(value: string): string {
	try {
		return decodeURIComponent(
			new URL(value, "https://blog.invalid").pathname,
		).replace(/\/+$/, "");
	} catch {
		return "";
	}
}

export function articleContext(article: BlogEvidence): string {
	return JSON.stringify({
		title: article.title,
		url: article.url,
		published: article.published,
		updated: article.updated,
		body: article.body,
		description: article.description,
		readingLevel: "相关正文片段，未保证覆盖全文",
		chunks: article.chunks?.map(({ id, heading, path, start, end }) => ({
			id,
			heading,
			path,
			start,
			end,
		})),
	});
}

export async function findBlogArticles(
	question: string,
	corpus: BlogArticle[],
	search: ArticleSearch,
	limit = 3,
): Promise<BlogArticle[]> {
	if (!question.trim()) return [];
	const byPath = new Map(
		corpus.map((article) => [pathKey(article.url), article]),
	);
	const found = await search(question.trim());
	const selected: BlogArticle[] = [];
	const seen = new Set<string>();
	for (const hit of found.results) {
		const article = byPath.get(pathKey((await hit.data()).url));
		if (!article || seen.has(article.id)) continue;
		seen.add(article.id);
		selected.push(article);
		if (selected.length >= Math.min(3, Math.max(1, limit))) break;
	}
	return selected;
}

/** Reveal relevant chunks after article discovery; whole-article loading is no longer required. */
export async function retrieveBlogArticles(
	question: string,
	corpus: BlogArticle[],
	deps: { search: ArticleSearch; fetch: (url: string) => Promise<Response> },
	options: { maxArticles?: number; maxContextChars?: number } = {},
): Promise<{
	articles: BlogEvidence[];
	omitted: BlogArticle[];
	context: string;
}> {
	const result = {
		articles: [] as BlogEvidence[],
		omitted: [] as BlogArticle[],
		context: "",
	};
	if (!question.trim()) return result;
	const maxArticles = Math.min(3, Math.max(1, options.maxArticles ?? 3));
	const budget = Math.max(0, options.maxContextChars ?? 48_000);
	const selected = await findBlogArticles(
		question,
		corpus,
		deps.search,
		maxArticles,
	);
	for (const article of selected) {
		const response = await deps.fetch(article.bodyUrl);
		if (!response.ok) throw new Error(`读取博文失败（${response.status}）`);
		const payload = await response.json();
		if (typeof payload?.body !== "string") throw new Error("博文正文格式无效");
		const chunks: RagChunk[] = Array.isArray(payload.chunks)
			? payload.chunks
			: splitPost({ ...article, body: payload.body });
		const ranked = retrieveChunks(question, chunks, {
			limit: 4,
			maxChars: Math.min(budget, 10000),
		});
		// Explicit article selection can ask for an overview without a matching body term.
		const candidates = ranked.length ? ranked : chunks.slice(0, 2);
		const chosen: RagChunk[] = [];
		let evidence: BlogEvidence = { ...article, body: "", chunks: chosen };
		for (const chunk of candidates) {
			const candidate = {
				...article,
				body: [...chosen, chunk].map((item) => item.text).join("\n\n"),
				chunks: [...chosen, chunk],
			};
			if (
				[result.context, articleContext(candidate)].filter(Boolean).join("\n")
					.length <= budget
			) {
				chosen.push(chunk);
				evidence = candidate;
			}
		}
		if (!chosen.length) {
			result.omitted.push(article);
			continue;
		}
		const next = [result.context, articleContext(evidence)]
			.filter(Boolean)
			.join("\n");
		if (next.length > budget) {
			result.omitted.push(article);
			continue;
		}
		result.articles.push(evidence);
		result.context = next;
	}
	return result;
}
