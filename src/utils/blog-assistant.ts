import {
	assistantQuestionKind,
	sanitizeAssistantAnswer,
} from "./blog-assistant-policy.ts";
import {
	type ArticleSearch,
	type BlogArticle,
	findBlogArticles,
} from "./blog-rag.ts";

const filler = new Set([
	"请",
	"介绍",
	"一下",
	"如何",
	"怎么",
	"什么",
	"为什么",
	"的",
	"了",
	"吗",
	"呢",
	"是",
	"我",
	"想",
	"知道",
	"文章",
	"博客",
	"一下子",
	"这个",
	"这篇",
	"一个",
	"有哪些",
	"有没有",
	"帮",
	"帮我",
	"讲讲",
]);

export function blogQueryTerms(question: string): string[] {
	const segments = new Intl.Segmenter("zh", { granularity: "word" }).segment(
		question.toLowerCase(),
	);
	return [
		...new Set(
			[...segments]
				.filter((item) => item.isWordLike && !filler.has(item.segment))
				.map((item) => item.segment),
		),
	].slice(0, 6);
}

export async function askBlogAssistant(
	question: string,
	corpus: BlogArticle[],
	deps: {
		pagePath: string;
		search: ArticleSearch;
		fetch: typeof fetch;
		signal?: AbortSignal;
	},
	history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<{ content: string }> {
	const current = corpus.find((article) => {
		try {
			return (
				decodeURIComponent(article.url).replace(/\/$/, "") ===
				decodeURIComponent(deps.pagePath).replace(/\/$/, "")
			);
		} catch {
			return false;
		}
	});
	const referringToPage = /这篇|本文|本篇|这个判断|核心观点|结论的边界/.test(
		question,
	);
	const selected =
		assistantQuestionKind(question) === "greeting"
			? []
			: current && referringToPage
				? [current]
				: await findBlogArticles(question, corpus, async (query) => {
						const direct = await deps.search(query);
						if (direct.results.length) return direct;
						const terms = blogQueryTerms(query);
						const groups = await Promise.all(
							terms.map((term) => deps.search(term)),
						);
						// Interleave keyword rankings, so one broad keyword cannot occupy every slot.
						const results: Awaited<ReturnType<ArticleSearch>>["results"] = [];
						for (
							let rank = 0;
							rank <
							Math.max(0, ...groups.map((group) => group.results.length));
							rank++
						) {
							for (const group of groups)
								if (group.results[rank]) results.push(group.results[rank]);
						}
						return { results };
					});
	deps.signal?.throwIfAborted();
	const response = await deps.fetch("/api/blog-chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		signal: deps.signal,
		body: JSON.stringify({
			question,
			articleIds: selected.map((article) => article.id),
			history: history.slice(-6),
		}),
	});
	const data = await response.json();
	if (!response.ok)
		throw new Error(
			typeof data.error === "string" ? data.error : "助手服务暂时不可用",
		);
	if (typeof data.answer !== "string" || !data.answer.trim())
		throw new Error("助手未返回有效回答");
	const sources: { title: string; url: string }[] = Array.isArray(data.sources)
		? data.sources.filter(
				(source: { title?: unknown; url?: unknown } | null) =>
					source &&
					selected.some(
						(article) =>
							article.url === source.url && article.title === source.title,
					),
			)
		: [];
	const links = sources
		.map(
			(source) =>
				`[${String(source.title).replace(/[[\]\n]/g, " ")}](${source.url})`,
		)
		.join(" · ");
	return {
		content: sanitizeAssistantAnswer(
			data.answer + (links ? `\n\n参考博文：${links}` : ""),
			corpus.map((article) => article.url),
		),
	};
}
