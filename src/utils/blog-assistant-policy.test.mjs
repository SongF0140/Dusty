import assert from "node:assert/strict";
import test from "node:test";
import {
	assistantQuestionKind,
	sanitizeAssistantAnswer,
} from "./blog-assistant-policy.ts";

test("greetings are distinguished from knowledge questions and reading requests", () => {
	assert.equal(assistantQuestionKind("你好呀！"), "greeting");
	assert.equal(assistantQuestionKind("你好，海问香 👋"), "greeting");
	assert.equal(assistantQuestionKind("你好，Git 如何撤销提交？"), "knowledge");
	assert.equal(assistantQuestionKind("推荐几篇适合入门的文章"), "reading");
});

test("only allowlisted blog links survive; external Markdown, HTML and bare URLs are removed", () => {
	const clean = sanitizeAssistantAnswer(
		'[博客](/posts/git/) [站外](https://outside.example/a) [虚构](/posts/unknown/) <a href="https://outside.example">官网</a> https://outside.example/raw <https://outside.example/auto> www.outside.example github.com/docs [参考][r]\n[r]: https://outside.example/ref',
		["/posts/git/"],
	);
	assert.match(clean, /\[博客\]\(\/posts\/git\/\)/);
	assert.match(clean, /站外/);
	assert.match(clean, /官网/);
	assert.ok(!clean.includes("outside.example"));
	assert.ok(!clean.includes("/posts/unknown/"));
	assert.ok(!clean.includes("href="));
	assert.ok(!clean.includes("github.com"));
});

test("encoded public blog links are normalized and code-like product names remain text", () => {
	const clean = sanitizeAssistantAnswer(
		"[文章](/posts/%E4%B8%AD%E6%96%87/) Node.js 和 console.log",
		["/posts/中文/"],
	);
	assert.match(clean, /\[文章\]\(\/posts\/中文\/\)/);
	assert.match(clean, /Node\.js 和 console\.log/);
});
