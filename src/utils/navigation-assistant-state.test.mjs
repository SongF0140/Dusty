import assert from "node:assert/strict";
import test from "node:test";
import {
	ASSISTANT_STORAGE_KEY,
	clearAssistantState,
	loadAssistantState,
	NAVIGATION_MODE_KEY,
	readNavigationMode,
	saveAssistantState,
	saveNavigationMode,
} from "./navigation-assistant-state.ts";

function memoryStorage() {
	const values = new Map();
	return {
		values,
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key),
	};
}

test("mode defaults to terminal and only restores a recognized mode", () => {
	const storage = memoryStorage();
	assert.equal(readNavigationMode(storage), "terminal");
	assert.equal(saveNavigationMode(storage, "assistant"), true);
	assert.equal(readNavigationMode(storage), "assistant");
	storage.setItem(NAVIGATION_MODE_KEY, "unknown");
	assert.equal(readNavigationMode(storage), "terminal");
});

test("assistant transcript and unsent draft survive a browser reload without inventing messages", () => {
	const storage = memoryStorage();
	assert.deepEqual(loadAssistantState(storage), {
		version: 1,
		draft: "",
		messages: [],
	});
	const state = {
		version: 1,
		draft: "还没发送的疑问\n保留换行",
		messages: [
			{ id: "q1", role: "user", content: "作者如何判断瓶颈？" },
			{ id: "a1", role: "assistant", content: "先读原文，再区分推论。" },
		],
	};
	assert.equal(saveAssistantState(storage, state), true);
	assert.deepEqual(loadAssistantState(storage), state);
});

test("malformed and future-version storage fails closed; invalid messages are excluded", () => {
	const storage = memoryStorage();
	for (const value of [
		"broken JSON",
		"null",
		"[]",
		'{"version":2,"draft":"old"}',
	]) {
		storage.setItem(ASSISTANT_STORAGE_KEY, value);
		assert.deepEqual(loadAssistantState(storage), {
			version: 1,
			draft: "",
			messages: [],
		});
	}
	storage.setItem(
		ASSISTANT_STORAGE_KEY,
		JSON.stringify({
			version: 1,
			draft: 42,
			messages: [
				{ id: "ok", role: "user", content: "<script>literal text</script>" },
				{ id: "bad", role: "system", content: "untrusted instructions" },
				{ id: "missing", role: "assistant" },
				null,
			],
		}),
	);
	assert.deepEqual(loadAssistantState(storage), {
		version: 1,
		draft: "",
		messages: [
			{ id: "ok", role: "user", content: "<script>literal text</script>" },
		],
	});
});

test("oversized stored data is bounded and clearing leaves the shell and notes alone", () => {
	const storage = memoryStorage();
	saveNavigationMode(storage, "assistant");
	storage.setItem("dusty:reading-note:v1:/posts/a", "我的便签");
	const messages = Array.from({ length: 120 }, (_, i) => ({
		id: String(i),
		role: "user",
		content: "a".repeat(13000),
	}));
	assert.equal(
		saveAssistantState(storage, {
			version: 1,
			draft: "b".repeat(13000),
			messages,
		}),
		true,
	);
	const restored = loadAssistantState(storage);
	assert.equal(restored.draft.length, 12000);
	assert.equal(restored.messages.length, 100);
	assert.equal(restored.messages[0].id, "20");
	assert.equal(restored.messages[0].content.length, 12000);
	assert.equal(clearAssistantState(storage), true);
	assert.deepEqual(loadAssistantState(storage).messages, []);
	assert.equal(readNavigationMode(storage), "assistant");
	assert.equal(storage.getItem("dusty:reading-note:v1:/posts/a"), "我的便签");
});

test("blocked browser storage never throws or reports a successful save or clear", () => {
	const blocked = {
		getItem() {
			throw Error("blocked");
		},
		setItem() {
			throw Error("quota");
		},
		removeItem() {
			throw Error("blocked");
		},
	};
	for (const storage of [blocked, null]) {
		assert.equal(readNavigationMode(storage), "terminal");
		assert.deepEqual(loadAssistantState(storage), {
			version: 1,
			draft: "",
			messages: [],
		});
		assert.equal(
			saveAssistantState(storage, { version: 1, draft: "note", messages: [] }),
			false,
		);
		assert.equal(saveNavigationMode(storage, "assistant"), false);
		assert.equal(clearAssistantState(storage), false);
	}
});
