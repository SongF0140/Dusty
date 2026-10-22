import { waitUntil } from "@vercel/functions";
import {
	createBlogRuntime,
	runtimeConfigured,
} from "../src/server/blog-agent-runtime.ts";
import { readBlogToken } from "../src/server/blog-auth.ts";
import {
	type NodeRequest,
	type NodeResponse,
	nodeReply,
	webRequest,
} from "../src/server/blog-node-adapter.ts";
import { runQueueJob } from "../src/server/blog-queue.ts";
export default async function handler(req: NodeRequest, res: NodeResponse) {
	const request = webRequest(req, process.env, "/api/blog-worker");
	const token = readBlogToken(
		request.headers.get("authorization")?.replace(/^Bearer /, "") || "",
		process.env,
	);
	if (
		request.method !== "POST" ||
		token?.purpose !== "worker" ||
		!runtimeConfigured(process.env)
	) {
		await nodeReply(new Response(null, { status: 403 }), res);
		return;
	}
	const runtime = createBlogRuntime(process.env);
	waitUntil(
		runQueueJob(runtime.queue, runtime.ask, runtime.wake).catch(() =>
			console.error("Blog queue worker failed; pending jobs remain durable."),
		),
	);
	await nodeReply(
		Response.json(
			{ accepted: true },
			{ status: 202, headers: { "Cache-Control": "no-store" } },
		),
		res,
	);
}
