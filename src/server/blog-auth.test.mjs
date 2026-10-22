import assert from "node:assert/strict";
import test from "node:test";
import { handleBlogAuth, readBlogSession, signBlogToken } from "./blog-auth.ts";

const env = {
	BLOG_SITE_URL: "https://blog.test",
	BLOG_GITHUB_CLIENT_ID: "client",
	BLOG_GITHUB_CLIENT_SECRET: "secret",
	BLOG_SESSION_SECRET: "x".repeat(48),
};
test("login has PKCE, no repository scopes, and signed browser-bound state", async () => {
	const response = await handleBlogAuth(
		new Request(
			"https://blog.test/api/blog-auth?action=login&returnTo=//outside.test",
		),
		env,
	);
	const url = new URL(response.headers.get("location"));
	assert.equal(url.hostname, "github.com");
	assert.equal(url.searchParams.get("code_challenge_method"), "S256");
	assert.ok(!url.searchParams.has("scope"));
	assert.match(response.headers.get("set-cookie"), /HttpOnly.*Secure/);
});
test("forged or expired cookies cannot impersonate GitHub accounts", () => {
	const token = signBlogToken(
		{ purpose: "session", id: "12", login: "reader", exp: Date.now() + 10000 },
		env,
	);
	const request = new Request("https://blog.test", {
		headers: { cookie: `blog_session=${token}` },
	});
	assert.equal(readBlogSession(request, env).id, "12");
	assert.equal(
		readBlogSession(
			new Request("https://blog.test", {
				headers: { cookie: `blog_session=${token}forged` },
			}),
			env,
		),
		null,
	);
	const expired = signBlogToken(
		{ purpose: "session", id: "12", login: "reader", exp: 1 },
		env,
	);
	assert.equal(
		readBlogSession(
			new Request("https://blog.test", {
				headers: { cookie: `blog_session=${expired}` },
			}),
			env,
		),
		null,
	);
});
test("OAuth callback rejects missing state before any token request", async () => {
	const response = await handleBlogAuth(
		new Request("https://blog.test/api/blog-auth?code=wrong&state=wrong"),
		env,
		async () => assert.fail("no GitHub request"),
	);
	assert.equal(response.status, 400);
});
test("OAuth callback exchanges PKCE and sets only an identity session with separate cookies", async () => {
	const login = await handleBlogAuth(
		new Request(
			"https://blog.test/api/blog-auth?action=login&returnTo=%2Fposts%2Fgit%2F",
		),
		env,
	);
	const flowCookie = login.headers.getSetCookie()[0].split(";")[0];
	const state = new URL(login.headers.get("location")).searchParams.get(
		"state",
	);
	let calls = 0;
	const response = await handleBlogAuth(
		new Request(
			`https://blog.test/api/blog-auth?code=test-code&state=${state}`,
			{ headers: { cookie: flowCookie } },
		),
		env,
		async (url, init) => {
			calls++;
			if (calls === 1) {
				assert.equal(
					String(url),
					"https://github.com/login/oauth/access_token",
				);
				assert.ok(new URLSearchParams(init.body).get("code_verifier"));
				return Response.json({ access_token: "test-only-token" });
			}
			assert.equal(String(url), "https://api.github.com/user");
			return Response.json({ id: 123, login: "reader" });
		},
	);
	assert.equal(response.status, 302);
	assert.equal(
		response.headers.get("location"),
		"https://blog.test/posts/git/",
	);
	const cookies = response.headers.getSetCookie();
	assert.equal(cookies.length, 2);
	assert.match(cookies[0], /Max-Age=0/);
	assert.ok(!cookies.join().includes("test-only-token"));
	assert.deepEqual(
		readBlogSession(
			new Request("https://blog.test", {
				headers: { cookie: cookies[1].split(";")[0] },
			}),
			env,
		),
		{ id: "123", login: "reader" },
	);
});
