import assert from "node:assert/strict";
import test from "node:test";
import { createBlogRuntime } from "./blog-agent-runtime.ts";
import { readBlogToken } from "./blog-auth.ts";

test("production wakes the signed worker through the public site instead of the protected deployment URL", async () => {
	const env = {
		DATABASE_URL: "postgresql://test:test@database.test/blog",
		BLOG_SESSION_SECRET: "test-session-secret-with-at-least-32-characters",
		BLOG_SITE_URL: "https://mjzy.tech",
		VERCEL_ENV: "production",
		VERCEL_URL: "protected-deployment.vercel.app",
	};
	let calls = 0;
	const runtime = createBlogRuntime(env, async (url, options) => {
		calls++;
		assert.equal(url, "https://mjzy.tech/api/blog-worker");
		assert.equal(options.method, "POST");
		const token = options.headers.Authorization.replace(/^Bearer /, "");
		assert.equal(readBlogToken(token, env).purpose, "worker");
		return new Response(null, { status: 202 });
	});
	await runtime.wake();
	assert.equal(calls, 1);
});

test("preview wakes its own deployment and retains deployment protection credentials", async () => {
	const env = {
		DATABASE_URL: "postgresql://test:test@database.test/blog",
		BLOG_SESSION_SECRET: "test-session-secret-with-at-least-32-characters",
		VERCEL_ENV: "preview",
		VERCEL_URL: "preview-deployment.vercel.app",
		VERCEL_AUTOMATION_BYPASS_SECRET: "test-only-protection-secret",
	};
	await createBlogRuntime(env, async (url, options) => {
		assert.equal(url, "https://preview-deployment.vercel.app/api/blog-worker");
		assert.equal(
			options.headers["x-vercel-protection-bypass"],
			env.VERCEL_AUTOMATION_BYPASS_SECRET,
		);
		return new Response(null, { status: 202 });
	}).wake();
});
