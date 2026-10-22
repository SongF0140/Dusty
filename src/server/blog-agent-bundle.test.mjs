import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
	BlogAgent,
	BlogCatalog,
	compatibleModel,
} from "../../vendor/starrylin/agent.mjs";

test("deployment bundle integrity and actual Pi HTTP tool loop", async () => {
	const base = new URL("../../vendor/starrylin/", import.meta.url);
	const manifest = JSON.parse(
		await readFile(new URL("manifest.json", base), "utf8"),
	);
	assert.equal(
		createHash("sha256")
			.update(await readFile(new URL("agent.mjs", base)))
			.digest("hex"),
		manifest.sha256,
	);
	let calls = 0;
	let tools = 0;
	let completed;
	const events = [];
	const configured = compatibleModel({
		baseUrl: "https://model.test/v1",
		model: "test-model",
		apiKey: "test-only",
		fetch: async (input, init) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			assert.equal(request.url, "https://model.test/v1/chat/completions");
			const payload = await request.json();
			assert.deepEqual(payload.tools.map((item) => item.function.name).sort(), [
				"list_categories",
				"read_post",
				"search_posts",
			]);
			const tool = ++calls === 1;
			const delta = tool
				? {
						role: "assistant",
						tool_calls: [
							{
								index: 0,
								id: "read-1",
								type: "function",
								function: {
									name: "read_post",
									arguments: '{"id":"git","level":"relevant","query":"撤销"}',
								},
							},
						],
					}
				: {
						content:
							"暂存区可以撤销。[Git](/posts/git/) [外部](https://outside.test)",
					};
			const chunk = {
				id: "mock",
				object: "chat.completion.chunk",
				created: 0,
				model: "test-model",
				choices: [{ index: 0, delta, finish_reason: null }],
			};
			const finish = {
				...chunk,
				choices: [
					{ index: 0, delta: {}, finish_reason: tool ? "tool_calls" : "stop" },
				],
			};
			return new Response(
				`data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(finish)}\n\ndata: [DONE]\n\n`,
				{ headers: { "Content-Type": "text/event-stream" } },
			);
		},
	});
	const agent = new BlogAgent({
		...configured,
		catalog: new BlogCatalog([
			{
				id: "git",
				title: "Git",
				url: "/posts/git/",
				body: "## 撤销\nGit 可以撤销暂存，保留工作区修改。",
			},
		]),
		store: {
			begin: async () => ({
				kind: "started",
				token: { userId: "1", requestId: "r", leaseId: "l" },
			}),
			modelStart: async () => calls + 1,
			toolStart: async () => ++tools,
			append: async (_token, type) => {
				await new Promise((resolve) => setTimeout(resolve, 1));
				events.push(type);
			},
			history: async () => [],
			complete: async (_token, result) => {
				completed = result;
				events.push("complete");
			},
			fail: async () => assert.fail("bundle must finish"),
		},
	});
	const result = await agent.ask({
		identity: { provider: "github", id: "1" },
		requestId: "r",
		conversationId: "c",
		question: "Git 如何撤销暂存？",
	});
	assert.equal(calls, 2);
	assert.equal(result.modelCalls, 2);
	assert.equal(completed, result);
	assert.ok(result.sources.some((source) => source.id === "git"));
	assert.ok(!result.answer.includes("https://"));
	assert.equal(events.at(-1), "complete");
	assert.ok(events.includes("turn_end"));
});
