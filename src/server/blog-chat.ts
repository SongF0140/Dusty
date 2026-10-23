import {
	type createBlogRuntime,
	runtimeConfigured,
} from "./blog-agent-runtime.ts";
import {
	authConfigured,
	type BlogAuthEnv,
	readBlogSession,
	siteOrigin,
} from "./blog-auth.ts";
import { queueEventStream } from "./blog-event-stream.ts";

type Runtime = ReturnType<typeof createBlogRuntime>;
const json = (value: unknown, status = 200) =>
	Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function handleBlogChat(
	request: Request,
	env: BlogAuthEnv,
	deps: { runtime(): Runtime; defer(promise: Promise<unknown>): void },
): Promise<Response> {
	const user = readBlogSession(request, env);
	const configured = runtimeConfigured(env);
	const requestId = new URL(request.url).searchParams.get("requestId");
	if (request.method === "GET" && !requestId)
		return json({
			configured,
			authConfigured: authConfigured(env),
			user,
			engine: "StarryLin",
			dailyLimit: 20,
		});
	if (!["GET", "POST"].includes(request.method))
		return json({ error: "仅支持 GET 或 POST" }, 405);
	if (!configured)
		return json({ error: "助手尚未配置 GitHub 登录、数据库或模型服务。" }, 503);
	if (!user)
		return json({ error: "请先使用 GitHub 登录。", loginRequired: true }, 401);
	try {
		const runtime = deps.runtime();
		const wake = () => deps.defer(runtime.wake().catch(() => undefined));
		if (request.method === "GET") {
			if (!requestId || !/^[\w-]{1,128}$/.test(requestId))
				return json({ error: "消息标识无效" }, 400);
			const row = await runtime.queue.status(user.id, requestId);
			if (!row) return json({ error: "消息不存在或无权访问" }, 404);
			if (row.status === "pending" || row.status === "running") wake();
			if (new URL(request.url).searchParams.get("stream") === "1") {
				const urls = (await runtime.catalog()).list().map((post) => post.url);
				return queueEventStream(
					row,
					() => runtime.queue.status(user.id, requestId),
					urls,
				);
			}
			return json({
				requestId,
				status: row.status,
				...(row.result || {}),
				...(row.error ? { error: row.error } : {}),
			});
		}
		if (request.headers.get("origin") !== siteOrigin(env))
			return json({ error: "不允许跨站请求" }, 403);
		const raw = await request.text();
		if (raw.length > 16000) return json({ error: "请求过长" }, 413);
		let body: {
			requestId?: unknown;
			conversationId?: unknown;
			question?: unknown;
			articleIds?: unknown;
		};
		try {
			body = JSON.parse(raw);
			if (!body || typeof body !== "object") throw Error();
		} catch {
			return json({ error: "请求格式无效" }, 400);
		}
		if (
			typeof body.question !== "string" ||
			!body.question.trim() ||
			body.question.length > 4000 ||
			![body.requestId, body.conversationId].every(
				(id) => typeof id === "string" && /^[\w-]{1,128}$/.test(id),
			) ||
			!Array.isArray(body.articleIds) ||
			body.articleIds.length > 3 ||
			body.articleIds.some((id) => typeof id !== "string" || id.length > 1000)
		)
			return json({ error: "问题、会话或消息标识无效" }, 400);
		const known = (await runtime.catalog()).list();
		if (body.articleIds.some((id) => !known.some((post) => post.id === id)))
			return json({ error: "文章不在公开目录中" }, 400);
		const state = await runtime.queue.enqueue({
			identity: { provider: "github", id: user.id },
			requestId: body.requestId as string,
			conversationId: body.conversationId as string,
			question: body.question.trim(),
			articleIds: body.articleIds as string[],
		});
		if (["conflict", "forbidden", "quota"].includes(state))
			return json(
				{
					error:
						state === "quota"
							? "今天的 20 次提问已用完"
							: state === "forbidden"
								? "无权访问其他用户的会话"
								: "重复消息 ID 的内容冲突",
				},
				state === "quota" ? 429 : 409,
			);
		wake();
		return json({ requestId: body.requestId, status: state }, 202);
	} catch {
		return json({ error: "助手服务暂不可用，请稍后重试。" }, 503);
	}
}
