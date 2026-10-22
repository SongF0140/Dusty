import { type BlogAuthEnv, siteOrigin } from "./blog-auth.ts";
export interface NodeRequest {
	method?: string;
	url?: string;
	headers: Record<string, string | string[] | undefined>;
	body?: unknown;
}
export interface NodeResponse {
	statusCode: number;
	setHeader(name: string, value: string | string[]): void;
	end(body: string): void;
}
export function webRequest(req: NodeRequest, env: BlogAuthEnv, path: string) {
	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers))
		if (typeof value === "string") headers.set(key, value);
	const method = req.method || "GET";
	return new Request(new URL(req.url || path, siteOrigin(env)), {
		method,
		headers,
		...(!["GET", "HEAD"].includes(method)
			? {
					body:
						typeof req.body === "string"
							? req.body
							: JSON.stringify(req.body || {}),
				}
			: {}),
	});
}
export async function nodeReply(response: Response, res: NodeResponse) {
	res.statusCode = response.status;
	response.headers.forEach((value, key) => {
		if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
	});
	const cookies = response.headers.getSetCookie();
	if (cookies.length) res.setHeader("Set-Cookie", cookies);
	res.end(await response.text());
}
