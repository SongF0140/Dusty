import assert from "node:assert/strict";
import test from "node:test";
import { completeCommand, navigationCommands, resolveCommand } from "./command-navigation.ts";

const commands = navigationCommands.map((item) => item.command);

test("completion supports prefixes, case and ambiguous commands", () => {
	assert.deepEqual(completeCommand("/bl", commands), ["/blog"]);
	assert.deepEqual(completeCommand(" /A ", commands), ["/archive", "/about"]);
	assert.deepEqual(completeCommand("/does-not-exist", commands), []);
});

test("blog and note resolve only to existing site routes", () => {
	assert.equal(resolveCommand(" /BLOG ", navigationCommands)?.path, "/archive/");
	assert.equal(resolveCommand("/note", navigationCommands)?.path, "/categories/");
});

test("arbitrary commands, arguments and external URLs are rejected", () => {
	for (const value of ["rm -rf /", "/blog;alert(1)", "/blog https://example.com", "https://example.com"]) {
		assert.equal(resolveCommand(value, navigationCommands), undefined);
	}
});
