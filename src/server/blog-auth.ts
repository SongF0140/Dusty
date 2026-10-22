import {
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
export type BlogAuthEnv = Record<string, string | undefined>;
export interface BlogSession {
	id: string;
	login: string;
}
export const siteOrigin = (env: BlogAuthEnv) =>
	new URL(env.BLOG_SITE_URL || "https://mjzy.tech").origin;
export function authConfigured(env: BlogAuthEnv) {
	return Boolean(
		env.BLOG_GITHUB_CLIENT_ID &&
			env.BLOG_GITHUB_CLIENT_SECRET &&
			(env.BLOG_SESSION_SECRET?.length || 0) >= 32,
	);
}
export function signBlogToken(
	payload: Record<string, unknown>,
	env: BlogAuthEnv,
) {
	if ((env.BLOG_SESSION_SECRET?.length || 0) < 32)
		throw new Error("Session secret is not configured");
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	return `${body}.${createHmac("sha256", env.BLOG_SESSION_SECRET || "")
		.update(body)
		.digest("base64url")}`;
}
export function readBlogToken(
	token: string,
	env: BlogAuthEnv,
): Record<string, unknown> | null {
	try {
		if (token.length > 4096 || (env.BLOG_SESSION_SECRET?.length || 0) < 32)
			return null;
		const [body, signature, ...extra] = token.split(".");
		if (extra.length || !body || !signature) return null;
		const expected = createHmac("sha256", env.BLOG_SESSION_SECRET || "")
			.update(body)
			.digest();
		const actual = Buffer.from(signature, "base64url");
		if (actual.length !== expected.length || !timingSafeEqual(expected, actual))
			return null;
		const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
		return typeof payload.exp === "number" && payload.exp > Date.now()
			? payload
			: null;
	} catch {
		return null;
	}
}
function cookieValue(request: Request, name: string) {
	return (
		(request.headers.get("cookie") || "")
			.split(";")
			.map((item) => item.trim())
			.find((item) => item.startsWith(`${name}=`))
			?.slice(name.length + 1) || ""
	);
}
function cookie(name: string, value: string, maxAge: number, env: BlogAuthEnv) {
	return `${name}=${value}; Path=/; HttpOnly; ${siteOrigin(env).startsWith("https:") ? "Secure; " : ""}SameSite=Lax; Max-Age=${maxAge}`;
}
export function readBlogSession(
	request: Request,
	env: BlogAuthEnv,
): BlogSession | null {
	const payload = readBlogToken(cookieValue(request, "blog_session"), env);
	return payload?.purpose === "session" &&
		typeof payload.id === "string" &&
		/^\d{1,30}$/.test(payload.id) &&
		typeof payload.login === "string"
		? { id: payload.id, login: payload.login }
		: null;
}
export async function handleBlogAuth(
	request: Request,
	env: BlogAuthEnv,
	fetcher: typeof fetch = fetch,
): Promise<Response> {
	const url = new URL(request.url);
	const action = url.searchParams.has("code")
		? "callback"
		: url.searchParams.get("action") || "session";
	const headers = new Headers({ "Cache-Control": "no-store" });
	const json = (data: unknown, status = 200) =>
		Response.json(data, { status, headers });
	if (action === "session")
		return json({
			configured: authConfigured(env),
			user: readBlogSession(request, env),
		});
	if (!authConfigured(env))
		return json({ error: "GitHub 登录尚未配置，请联系博主。" }, 503);
	if (action === "logout") {
		if (
			request.method !== "POST" ||
			request.headers.get("origin") !== siteOrigin(env)
		)
			return json({ error: "不允许此请求" }, 403);
		headers.set("Set-Cookie", cookie("blog_session", "", 0, env));
		return json({ ok: true });
	}
	if (request.method !== "GET") return json({ error: "仅支持 GET" }, 405);
	if (action === "login") {
		const state = randomBytes(24).toString("base64url");
		const verifier = randomBytes(32).toString("base64url");
		const raw = url.searchParams.get("returnTo") || "/";
		const candidate = new URL(raw, siteOrigin(env));
		const returnTo =
			candidate.origin === siteOrigin(env)
				? `${candidate.pathname}${candidate.search}${candidate.hash}`
				: "/";
		headers.set(
			"Set-Cookie",
			cookie(
				"blog_oauth",
				signBlogToken(
					{
						purpose: "oauth",
						state,
						verifier,
						returnTo,
						exp: Date.now() + 600000,
					},
					env,
				),
				600,
				env,
			),
		);
		const target = new URL("https://github.com/login/oauth/authorize");
		for (const [key, value] of Object.entries({
			client_id: env.BLOG_GITHUB_CLIENT_ID || "",
			redirect_uri: `${siteOrigin(env)}/api/blog-auth`,
			state,
			code_challenge: createHash("sha256").update(verifier).digest("base64url"),
			code_challenge_method: "S256",
		}))
			target.searchParams.set(key, value);
		headers.set("Location", target.href);
		return new Response(null, { status: 302, headers });
	}
	if (action !== "callback") return json({ error: "未知操作" }, 400);
	const flow = readBlogToken(cookieValue(request, "blog_oauth"), env);
	headers.append("Set-Cookie", cookie("blog_oauth", "", 0, env));
	if (
		flow?.purpose !== "oauth" ||
		flow.state !== url.searchParams.get("state") ||
		typeof flow.verifier !== "string"
	)
		return json({ error: "登录状态已失效，请重新登录。" }, 400);
	try {
		const token = await fetcher("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			signal: AbortSignal.timeout(10000),
			body: new URLSearchParams({
				client_id: env.BLOG_GITHUB_CLIENT_ID || "",
				client_secret: env.BLOG_GITHUB_CLIENT_SECRET || "",
				code: url.searchParams.get("code") || "",
				redirect_uri: `${siteOrigin(env)}/api/blog-auth`,
				code_verifier: flow.verifier,
			}),
		});
		if (!token.ok) throw Error();
		const data = await token.json();
		if (typeof data.access_token !== "string") throw Error();
		const response = await fetcher("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${data.access_token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "Dusty-Blog-Assistant",
			},
			signal: AbortSignal.timeout(10000),
		});
		if (!response.ok) throw Error();
		const user = await response.json();
		if (!/^\d{1,30}$/.test(String(user.id)) || typeof user.login !== "string")
			throw Error();
		headers.append(
			"Set-Cookie",
			cookie(
				"blog_session",
				signBlogToken(
					{
						purpose: "session",
						id: String(user.id),
						login: user.login.slice(0, 100),
						exp: Date.now() + 7 * 86400000,
					},
					env,
				),
				7 * 86400,
				env,
			),
		);
		headers.set(
			"Location",
			new URL(String(flow.returnTo || "/"), siteOrigin(env)).href,
		);
		return new Response(null, { status: 302, headers });
	} catch {
		return json({ error: "GitHub 登录失败，请重新尝试。" }, 502);
	}
}
