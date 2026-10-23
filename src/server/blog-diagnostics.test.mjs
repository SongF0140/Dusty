import assert from "node:assert/strict";
import test from "node:test";
import { modelFailureCode } from "./blog-diagnostics.ts";

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
