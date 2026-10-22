import { handleBlogAuth } from "../src/server/blog-auth.ts";
import {
	type NodeRequest,
	type NodeResponse,
	nodeReply,
	webRequest,
} from "../src/server/blog-node-adapter.ts";
export default async function handler(req: NodeRequest, res: NodeResponse) {
	try {
		await nodeReply(
			await handleBlogAuth(
				webRequest(req, process.env, "/api/blog-auth"),
				process.env,
			),
			res,
		);
	} catch {
		await nodeReply(
			Response.json(
				{ error: "登录服务暂不可用" },
				{ status: 503, headers: { "Cache-Control": "no-store" } },
			),
			res,
		);
	}
}
