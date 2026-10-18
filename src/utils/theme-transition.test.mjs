import assert from "node:assert/strict";
import test from "node:test";
import { transitionTheme } from "./theme-transition.ts";

test("the page holds its skeleton after the icon animation and waits for palette settling", async () => {
	const calls = [];
	const waits = [];
	const pending = transitionTheme(
		() => calls.push("icon"),
		() => calls.push("theme"),
		false,
		(ms) => new Promise((resolve) => waits.push({ ms, resolve })),
	);
	assert.deepEqual(calls, []);
	assert.equal(waits[0].ms, 100);
	waits[0].resolve();
	await Promise.resolve();
	assert.deepEqual(calls, ["icon"]);
	assert.equal(waits[1].ms, 100);
	waits[1].resolve();
	await Promise.resolve();
	assert.deepEqual(calls, ["icon"]);
	assert.equal(waits[2].ms, 260);
	waits[2].resolve();
	await Promise.resolve();
	assert.deepEqual(calls, ["icon", "theme"]);
	assert.equal(waits[3].ms, 180);
	waits[3].resolve();
	await pending;
	assert.deepEqual(calls, ["icon", "theme"]);
});

test("reduced motion changes the icon and page immediately without waiting", async () => {
	const calls = [];
	await transitionTheme(() => calls.push("icon"), () => calls.push("theme"), true,
		() => assert.fail("reduced motion must not wait"));
	assert.deepEqual(calls, ["icon", "theme"]);
});

test("page completion waits for the last asynchronous component", async () => {
	let finishComponent;
	let complete = false;
	const component = new Promise(resolve => { finishComponent = resolve; });
	const pending = transitionTheme(() => {}, () => component, false, async () => {}).then(() => { complete = true; });
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(complete, false);
	finishComponent();
	await pending;
	assert.equal(complete, true);
});
