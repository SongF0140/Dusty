import {
	assistantQuestionKind,
	sanitizeAssistantAnswer,
} from "./blog-assistant-policy.ts";
import type { ArticleSearch, BlogArticle } from "./blog-rag.ts";
import { refersToArticle } from "./blog-reading-context.ts";

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
		search?: ArticleSearch;
		fetch: typeof fetch;
		signal?: AbortSignal;
		requestId?: string;
		conversationId?: string;
		onStatus?(status: string): void;
		onPartial?(text: string): void;
		onEnqueued?(): void;
		onQuota?(quota: unknown): void;
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
	const referringToPage = refersToArticle(question);
	const selected =
		assistantQuestionKind(question) === "greeting"
			? []
			: current && referringToPage
				? [current]
				: [];
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
			pagePath: deps.pagePath,
		}),
	});
	const data = await response.json();
	if ("quota" in data) deps.onQuota?.(data.quota);
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
		onPartial?(text: string): void;
		wait?(): Promise<void>;
	},
): Promise<{ content: string }> {
	for (;;) {
		deps.signal?.throwIfAborted();
		const response = await deps.fetch(
			`/api/blog-chat?requestId=${encodeURIComponent(requestId)}${deps.onPartial ? "&stream=1" : ""}`,
			{
				signal: deps.signal,
				...(deps.onPartial ? { headers: { Accept: "text/event-stream" } } : {}),
			},
		);
		if (
			response.ok &&
			response.headers.get("content-type")?.startsWith("text/event-stream") &&
			response.body
		) {
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			try {
				for (;;) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder
						.decode(value, { stream: true })
						.replace(/\r\n/g, "\n");
					if (buffer.length > 100000) throw new Error("流式响应过长");
					for (;;) {
						const end = buffer.indexOf("\n\n");
						if (end < 0) break;
						const frame = buffer.slice(0, end);
						buffer = buffer.slice(end + 2);
						const event = /^event: (.+)$/m.exec(frame)?.[1];
						const raw = /^data: (.+)$/m.exec(frame)?.[1];
						if (!raw) continue;
						const data = JSON.parse(raw);
						if (event === "failure")
							throw new Error(
								typeof data.error === "string" ? data.error : "本次回答失败",
							);
						if (event === "done") return formatBlogAnswer(data, corpus);
						if (event === "update" && typeof data.answer === "string")
							deps.onPartial?.(
								sanitizeAssistantAnswer(
									data.answer,
									corpus.map((post) => post.url),
								),
							);
					}
				}
			} finally {
				await reader.cancel().catch(() => undefined);
			}
			continue;
		}
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
