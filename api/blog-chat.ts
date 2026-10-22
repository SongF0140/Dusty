import { waitUntil } from "@vercel/functions";
import { createBlogRuntime } from "../src/server/blog-agent-runtime.ts";
import { handleBlogChat } from "../src/server/blog-chat.ts";
import {
	type NodeRequest,
	type NodeResponse,
	nodeReply,
	webRequest,
} from "../src/server/blog-node-adapter.ts";
export default async function handler(req: NodeRequest, res: NodeResponse) {
	try {
		await nodeReply(
			await handleBlogChat(
				webRequest(req, process.env, "/api/blog-chat"),
				process.env,
				{ runtime: () => createBlogRuntime(process.env), defer: waitUntil },
			),
			res,
		);
	} catch {
		await nodeReply(
			Response.json(
				{ error: "助手服务暂不可用" },
				{ status: 503, headers: { "Cache-Control": "no-store" } },
			),
			res,
		);
	}
}
