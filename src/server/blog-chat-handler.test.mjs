import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import handler from "../../api/blog-chat.ts";

test("Vercel handler reads the built article snapshot and hides credentials", async () => {
	const articles = JSON.parse(
		await readFile("dist/api/rag/articles.json", "utf8"),
	);
	const corpus = JSON.parse(await readFile("dist/api/rag/corpus.json", "utf8"));
	assert.ok(articles.length > 0);
	assert.equal(articles.length, corpus.length);
	const source = corpus.find(
		(item) => item.body.length > 100 && item.body.length < 20_000,
	);
	assert.ok(source);
	const saved = { ...process.env },
		originalFetch = globalThis.fetch;
	process.env.BLOG_LLM_BASE_URL = "https://rag-model.test/v1";
	process.env.BLOG_LLM_MODEL = "test-model";
	process.env.BLOG_LLM_API_KEY = "test-only-secret";
	let modelCalls = 0;
	globalThis.fetch = async (url, init) => {
		assert.equal(url, "https://rag-model.test/v1/chat/completions");
		const messages = JSON.parse(init.body).messages;
		assert.ok(
			messages
				.at(-1)
				.content.includes(JSON.stringify(source.body).slice(1, 80)),
		);
		modelCalls++;
		return Response.json({
			choices: [{ message: { content: "根据原文回答。" } }],
		});
	};
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
	try {
		await handler(
			{
				method: "POST",
				headers: { host: "blog.example", origin: "https://blog.example" },
				body: { question: "这篇文章讲什么", articleIds: [source.id] },
			},
			response,
		);
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(modelCalls, 1);
		assert.equal(JSON.parse(response.body).sources[0].id, source.id);
		assert.ok(!response.body.includes("test-only-secret"));
	} finally {
		globalThis.fetch = originalFetch;
		for (const key of [
			"BLOG_LLM_BASE_URL",
			"BLOG_LLM_MODEL",
			"BLOG_LLM_API_KEY",
		]) {
			if (saved[key] === undefined) delete process.env[key];
			else process.env[key] = saved[key];
		}
	}
});
