import assert from "node:assert/strict";
import test from "node:test";
import {
	modelFailureCode,
	modelFailureMessage,
	observeModelFetch,
} from "./blog-diagnostics.ts";

test("diagnostics classify provider failures without returning raw secrets or messages", () => {
	assert.equal(
		modelFailureCode(
			"400 unsupported parameter: max_completion_tokens secret-test",
		),
		"unsupported_max_tokens",
	);
	assert.equal(
		modelFailureCode("401 invalid API key secret-test"),
		"authentication",
	);
	assert.equal(modelFailureCode("Request timed out after 45000ms"), "timeout");
	assert.equal(
		modelFailureCode("400 tool_choice unsupported"),
		"unsupported_tools",
	);
	assert.equal(modelFailureCode("Something secret-test"), "unknown");
});

test("provider HTTP failures become safe actionable errors without exposing the response or credentials", async () => {
	let failure;
	const response = await observeModelFetch(
		async () => new Response("secret upstream body", { status: 429 }),
		(code) => {
			failure = code;
		},
	)("https://model.test/v1/chat/completions");
	assert.equal(response.status, 429);
	assert.equal(failure, "quota_or_rate_limit");
	assert.match(modelFailureMessage(failure), /模型服务.*额度.*限流/);
	assert.ok(!modelFailureMessage(failure).includes("secret"));
	let called = false;
	await observeModelFetch(
		async () => new Response("ok"),
		() => {
			called = true;
		},
	)("https://model.test");
	assert.equal(called, false);
});
