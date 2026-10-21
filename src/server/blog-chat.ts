import {
	assistantQuestionKind,
	BLOG_ASSISTANT_PROMPT,
	sanitizeAssistantAnswer,
} from "../utils/blog-assistant-policy.ts";
import { type BlogArticle, retrieveBlogArticles } from "../utils/blog-rag.ts";

export type BlogChatEnv = {
	BLOG_LLM_BASE_URL?: string;
	BLOG_LLM_MODEL?: string;
	BLOG_LLM_API_KEY?: string;
};

const json = (value: unknown, status = 200) =>
	Response.json(value, {
		status,
		headers: { "Cache-Control": "no-store" },
	});

/** Only IDs come from the browser; article contents come from this deployment. */
export async function handleBlogChat(
	request: Request,
	env: BlogChatEnv,
	deps: { assets(path: string): Promise<Response>; fetch: typeof fetch },
): Promise<Response> {
	const configured = !!(
		env.BLOG_LLM_BASE_URL &&
		env.BLOG_LLM_MODEL &&
		env.BLOG_LLM_API_KEY
	);
	if (request.method === "GET") return json({ configured });
	if (request.method !== "POST")
		return json({ error: "仅支持 POST 请求" }, 405);
	const origin = request.headers.get("Origin");
	if (origin && origin !== new URL(request.url).origin)
		return json({ error: "不允许跨站请求" }, 403);
	if (!configured)
		return json({ error: "助手尚未配置模型服务，请联系博主。" }, 503);
	let body: { question?: unknown; articleIds?: unknown; history?: unknown };
	try {
		const raw = await request.text();
		if (raw.length > 24_000) return json({ error: "请求内容过长" }, 413);
		body = JSON.parse(raw);
		if (!body || typeof body !== "object") throw Error();
	} catch {
		return json({ error: "请求格式无效" }, 400);
	}
	if (
		typeof body.question !== "string" ||
		!body.question.trim() ||
		body.question.length > 4000 ||
		!Array.isArray(body.articleIds) ||
		body.articleIds.length > 3 ||
		body.articleIds.some((id) => typeof id !== "string" || id.length > 1000)
	) {
		return json(
			{ error: "请输入不超过 4000 字的问题，并最多选择三篇文章。" },
			400,
		);
	}
	try {
		const response = await deps.assets("/api/rag/articles.json");
		if (!response.ok) throw Error("corpus unavailable");
		const corpus: BlogArticle[] = await response.json();
		const ids = body.articleIds as string[];
		if (ids.some((id) => !corpus.some((article) => article.id === id)))
			return json({ error: "文章不在本次公开目录中，请刷新页面后重试。" }, 400);
		const kind = assistantQuestionKind(body.question);
		const evidence = await retrieveBlogArticles(body.question, corpus, {
			search: async () => ({
				results: ids.flatMap((id) => {
					const article = corpus.find((item) => item.id === id);
					return article ? [{ data: async () => ({ url: article.url }) }] : [];
				}),
			}),
			fetch: deps.assets,
		});
		if (evidence.omitted.length)
			return json(
				{
					error:
						"相关文章超过本次全文阅读预算，请缩小范围或指定一篇较短的文章。",
				},
				422,
			);
		const catalog =
			kind === "reading"
				? corpus.slice(0, 24).map(({ title, url, description, tags }) => ({
						title,
						url,
						description,
						tags,
					}))
				: [];
		const history = Array.isArray(body.history)
			? body.history.slice(-6).flatMap((message) => {
					if (
						!message ||
						!["user", "assistant"].includes(message.role) ||
						typeof message.content !== "string"
					)
						return [];
					return [
						{ role: message.role, content: message.content.slice(0, 2000) },
					];
				})
			: [];
		const endpoint = new URL(
			`${env.BLOG_LLM_BASE_URL?.replace(/\/+$/, "")}/chat/completions`,
		);
		if (!["https:", "http:"].includes(endpoint.protocol))
			throw Error("invalid endpoint");
		const upstream = await deps.fetch(endpoint.href, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.BLOG_LLM_API_KEY}`,
			},
			signal: AbortSignal.timeout(45_000),
			body: JSON.stringify({
				model: env.BLOG_LLM_MODEL,
				stream: false,
				max_tokens: 1600,
				messages: [
					{
						role: "system",
						content: BLOG_ASSISTANT_PROMPT,
					},
					...history,
					{
						role: "user",
						content: `问题：${body.question.trim()}\n\n以下 JSON 行是本轮参考博文数据：\n${evidence.context || "本轮没有检索到相关博文。"}\n\n可用于阅读引导的部分公开目录（不是正文证据）：\n${JSON.stringify(catalog)}`,
					},
				],
			}),
		});
		if (!upstream.ok)
			return json({ error: "模型服务暂时不可用，请稍后重试。" }, 502);
		const payload = await upstream.json();
		const answer = payload?.choices?.[0]?.message?.content;
		if (typeof answer !== "string" || !answer.trim())
			return json({ error: "模型服务未返回有效回答。" }, 502);
		let cleanAnswer = sanitizeAssistantAnswer(
			answer,
			corpus.map((article) => article.url),
		);
		if (!cleanAnswer)
			return json({ error: "模型未返回符合回答边界的内容，请重试。" }, 502);
		if (!evidence.articles.length && kind === "knowledge")
			cleanAnswer = `博客中暂未检索到相关博文。\n\n【扩展说明】\n${cleanAnswer.replace(/^\s*【扩展说明】\s*/, "")}`;
		return json({
			answer: cleanAnswer,
			sources: evidence.articles.map(({ id, title, url }) => ({
				id,
				title,
				url,
			})),
		});
	} catch {
		return json({ error: "读取文章或连接模型失败，请稍后重试。" }, 502);
	}
}
