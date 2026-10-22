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
		requestId?: string;
		conversationId?: string;
		onStatus?(status: string): void;
		onEnqueued?(): void;
		wait?(): Promise<void>;
	},
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
			requestId: deps.requestId || crypto.randomUUID(),
			conversationId: deps.conversationId || crypto.randomUUID(),
			articleIds: selected.map((article) => article.id),
		}),
	});
	const data = await response.json();
	if (!response.ok)
		throw new Error(
			typeof data.error === "string" ? data.error : "助手服务暂时不可用",
		);
	deps.onEnqueued?.();
	if (response.status === 202) {
		return pollBlogAssistant(data.requestId, corpus, deps);
	}
	return formatBlogAnswer(data, corpus);
}

export async function pollBlogAssistant(
	requestId: string,
	corpus: BlogArticle[],
	deps: {
		fetch: typeof fetch;
		signal?: AbortSignal;
		onStatus?(status: string): void;
		wait?(): Promise<void>;
	},
): Promise<{ content: string }> {
	for (;;) {
		deps.signal?.throwIfAborted();
		const response = await deps.fetch(
			`/api/blog-chat?requestId=${encodeURIComponent(requestId)}`,
			{ signal: deps.signal },
		);
		const data = await response.json();
		if (!response.ok || data.status === "failed")
			throw new Error(
				typeof data.error === "string" ? data.error : "队列任务暂不可用",
			);
		if (data.status === "completed") return formatBlogAnswer(data, corpus);
		deps.onStatus?.(data.status);
		if (deps.wait) await deps.wait();
		else
			await new Promise<void>((resolve, reject) => {
				const abort = () => {
					clearTimeout(timer);
					reject(deps.signal?.reason || new Error("已停止等待"));
				};
				const timer = setTimeout(() => {
					deps.signal?.removeEventListener("abort", abort);
					resolve();
				}, 1200);
				deps.signal?.addEventListener("abort", abort, { once: true });
			});
	}
}

function formatBlogAnswer(
	data: { answer?: unknown; sources?: unknown },
	corpus: BlogArticle[],
): { content: string } {
	if (typeof data.answer !== "string" || !data.answer.trim())
		throw new Error("助手未返回有效回答");
	const sources: { title: string; url: string }[] = Array.isArray(data.sources)
		? data.sources.filter(
				(source: { title?: unknown; url?: unknown } | null) =>
					source &&
					corpus.some(
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
