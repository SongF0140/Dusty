import assert from "node:assert/strict";
import test from "node:test";
import { blogModelFetch } from "./blog-model-fetch.ts";

test("official DeepSeek disables thinking and preserves the agent output budget and tools", async () => {
	const controller = new AbortController();
	const wrapped = blogModelFetch(async (input, init) => {
		const request = new Request(input, init);
		const body = await request.json();
		assert.deepEqual(body.thinking, { type: "disabled" });
		assert.equal(body.max_tokens, 1600);
		assert.equal(body.max_completion_tokens, undefined);
		assert.deepEqual(body.tools, [{ type: "function" }]);
		assert.equal(request.headers.get("authorization"), "Bearer test-only");
		controller.abort();
		assert.equal(request.signal.aborted, true);
		return new Response("ok");
	});
	await wrapped(
		new Request("https://api.deepseek.com/chat/completions", {
			method: "POST",
			headers: { authorization: "Bearer test-only" },
			signal: controller.signal,
			body: JSON.stringify({
				model: "deepseek-flash",
				max_completion_tokens: 1600,
				tools: [{ type: "function" }],
			}),
		}),
	);
});

test("other providers and endpoints pass through untouched", async () => {
	for (const url of [
		"https://model.test/v1/chat/completions",
		"https://api.deepseek.com/models",
	]) {
		const init = { method: "POST", body: "unchanged" };
		await blogModelFetch(async (input, options) => {
			assert.equal(input, url);
			assert.equal(options, init);
			return new Response("ok");
		})(url, init);
	}
});
