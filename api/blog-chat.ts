import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { handleBlogChat } from "../src/server/blog-chat.ts";

type NodeRequest = {
	method?: string;
	headers: Record<string, string | string[] | undefined>;
	body?: unknown;
};
type NodeResponse = {
	statusCode: number;
	setHeader(name: string, value: string): void;
	end(body: string): void;
};

export default async function handler(req: NodeRequest, res: NodeResponse) {
	try {
		const host =
			typeof req.headers.host === "string" ? req.headers.host : "localhost";
		const protocol =
			req.headers["x-forwarded-proto"] === "http" ||
			/^(localhost|127\.0\.0\.1)(:|$)/.test(host)
				? "http"
				: "https";
		const headers = new Headers();
		for (const [name, value] of Object.entries(req.headers))
			if (typeof value === "string") headers.set(name, value);
		const request = new Request(`${protocol}://${host}/api/blog-chat`, {
			method: req.method || "GET",
			headers,
			...(req.method === "POST"
				? {
						body:
							typeof req.body === "string"
								? req.body
								: JSON.stringify(req.body ?? {}),
					}
				: {}),
		});
		let articles: { id: string; bodyUrl: string }[] | undefined;
		let bodies: { id: string; body: string }[] | undefined;
		const response = await handleBlogChat(
			request,
			{
				BLOG_LLM_BASE_URL: process.env.BLOG_LLM_BASE_URL,
				BLOG_LLM_MODEL: process.env.BLOG_LLM_MODEL,
				BLOG_LLM_API_KEY: process.env.BLOG_LLM_API_KEY,
			},
			{
				fetch,
				assets: async (path) => {
					articles ??= JSON.parse(
						await readFile(
							join(process.cwd(), "dist/api/rag/articles.json"),
							"utf8",
						),
					);
					if (path === "/api/rag/articles.json") return Response.json(articles);
					const article = articles?.find((item) => item.bodyUrl === path);
					if (!article) return new Response(null, { status: 404 });
					bodies ??= JSON.parse(
						await readFile(
							join(process.cwd(), "dist/api/rag/corpus.json"),
							"utf8",
						),
					);
					const content = bodies?.find((item) => item.id === article.id);
					return content
						? Response.json({ body: content.body })
						: new Response(null, { status: 404 });
				},
			},
		);
		res.statusCode = response.status;
		response.headers.forEach((value, name) => {
			res.setHeader(name, value);
		});
		res.end(await response.text());
	} catch {
		res.statusCode = 500;
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.setHeader("Cache-Control", "no-store");
		res.end(JSON.stringify({ error: "助手服务暂时不可用。" }));
	}
}
