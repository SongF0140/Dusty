import assert from "node:assert/strict";
import test from "node:test";
import handler from "../../api/blog-chat.ts";

test("Vercel handler reports the StarryLin engine and cannot expose configuration secrets", async () => {
	const response = {
		statusCode: 0,
		headers: {},
		setHeader(key, value) {
			this.headers[key] = value;
		},
		end(body) {
			this.body = body;
		},
	};
	await handler(
		{ method: "GET", url: "/api/blog-chat", headers: {} },
		response,
	);
	assert.equal(response.statusCode, 200);
	assert.equal(JSON.parse(response.body).engine, "StarryLin");
	assert.ok(!response.body.includes("BLOG_LLM_API_KEY"));
});
