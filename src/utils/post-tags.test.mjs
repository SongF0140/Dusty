import assert from "node:assert/strict";
import test from "node:test";
import { normalizePostTags, POST_TAGS } from "./post-tags.ts";

test("Qt API names and generic labels do not become navigation tags", () => {
	assert.deepEqual(
		normalizePostTags(["Qt", "C++", "GUI", "QTimer", "Q_PROPERTY", "第一个程序", "教程"], "Qt学习"),
		["Qt", "C++"],
	);
});

test("platform aliases are counted once and an RTOS topic remains available", () => {
	assert.deepEqual(
		normalizePostTags(["物联网", "ESP32-S3", "ESP-IDF", "嵌入式", "FreeRTOS", "多任务"], "物联网"),
		["嵌入式", "ESP32", "FreeRTOS"],
	);
});

test("a Docker article with only implementation keywords still has its main topic", () => {
	assert.deepEqual(normalizePostTags(["Dockerfile", "docker run", "镜像", "实践"], "Docker"), ["Docker"]);
});

test("case and whitespace variants merge without inventing new tags", () => {
	assert.deepEqual(normalizePostTags([" AI ", "ai", "ＡＩ", "Agent SDK", "Multi-Agent", "Tool Use", "unknown", "constructor", "__proto__"], "AI工程"), ["人工智能", "AI Agent"]);
});

test("real low-frequency frameworks stay, while version and ecosystem noise merge", () => {
	assert.deepEqual(normalizePostTags(["前端", "Vue2", "Vue3", "VueCli", "Vuex", "Vite"], "前端"), ["前端", "Vue"]);
	assert.deepEqual(normalizePostTags(["前端", "React", "Hooks", "Redux"], "前端"), ["前端", "React"]);
});

test("SQL synonyms retain the cross-topic database tag in the Qt series", () => {
	assert.deepEqual(normalizePostTags(["Qt", "C++", "GUI", "SQL", "SQLite", "数据库"], "Qt学习"), ["Qt", "C++", "数据库"]);
});

test("normalizing already curated tags is stable and each article has at most three", () => {
	const result = normalizePostTags(["前端", "React", "JavaScript", "Git", "Linux"], "前端");
	assert.equal(result.length, 3);
	assert.deepEqual(normalizePostTags(result, "前端"), result);
	assert.equal(new Set(result).size, result.length);
	assert.ok(result.every(tag => POST_TAGS.includes(tag)));
});

test("an unknown category or non-topic metadata cannot silently create a new tag", () => {
	assert.deepEqual(normalizePostTags(["导航", "指南", "心流", "2026", "临时专题"], "新栏目"), []);
	assert.deepEqual(normalizePostTags([], null), []);
	assert.deepEqual(normalizePostTags(["认知", "职场", "个人成长"], "方法论"), ["个人成长"]);
});
