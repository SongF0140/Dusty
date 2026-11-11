import assert from "node:assert/strict";
import test from "node:test";
import { waitForThemePage } from "./theme-page-loading.ts";

function installDOM(t, { islands = [], images = [], fonts = Promise.resolve() } = {}) {
	const values = {
		document: { querySelectorAll: () => islands, images, fonts: { ready: fonts } },
		getComputedStyle: () => ({ display: "block" }),
		innerWidth: 1200,
		innerHeight: 800,
		requestAnimationFrame: (callback) => setTimeout(callback, 0),
		cancelAnimationFrame: clearTimeout,
	};
	for (const [key, value] of Object.entries(values)) {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
		Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
		t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
	}
}

const rect = { width: 100, height: 100, top: 50, bottom: 150, left: 50, right: 150 };
class Island extends EventTarget {
	listeners = new Set();
	hasAttribute() { return true; }
	getClientRects() { return [rect]; }
	addEventListener(type, callback, options) {
		this.listeners.add(callback);
		super.addEventListener(type, callback, options);
	}
	removeEventListener(type, callback) {
		this.listeners.delete(callback);
		super.removeEventListener(type, callback);
	}
	dispatchEvent(event) {
		const result = super.dispatchEvent(event);
		if (event.type === "astro:hydrate") this.listeners.clear();
		return result;
	}
}

const settles = (promise) => Promise.race([
	promise.then(() => "ready"),
	new Promise(resolve => setTimeout(() => resolve("stuck"), 120)),
]);

test("theme readiness waits for a visible island before revealing", async t => {
	const island = new Island();
	installDOM(t, { islands: [island] });
	let finished = false;
	const pending = waitForThemePage({ timeoutMs: 80 }).then(() => { finished = true; });
	await new Promise(resolve => setTimeout(resolve, 5));
	assert.equal(finished, false);
	island.dispatchEvent(new Event("astro:hydrate"));
	await pending;
	assert.equal(finished, true);
	assert.equal(island.listeners.size, 0);
});

test("an island that never hydrates cannot trap the page behind its cover", async t => {
	const island = new Island();
	installDOM(t, { islands: [island] });
	assert.equal(await settles(waitForThemePage({ timeoutMs: 20 })), "ready");
	assert.equal(island.listeners.size, 0);
});

test("images inserted during hydration are ready before the cover is released", async t => {
	const island = new Island();
	const images = [];
	installDOM(t, { islands: [island], images });
	let finishImage;
	let finished = false;
	const pending = waitForThemePage({ timeoutMs: 100 }).then(() => { finished = true; });
	images.push({
		getClientRects: () => [rect],
		decode: () => new Promise(resolve => { finishImage = resolve; }),
	});
	island.dispatchEvent(new Event("astro:hydrate"));
	await new Promise(resolve => setTimeout(resolve, 10));
	assert.equal(finished, false);
	assert.equal(typeof finishImage, "function");
	finishImage();
	await pending;
});

test("stalled images or fonts cannot trap the loading state", async t => {
	installDOM(t, {
		fonts: new Promise(() => {}),
		images: [{ getClientRects: () => [rect], decode: () => new Promise(() => {}) }],
	});
	assert.equal(await settles(waitForThemePage({ timeoutMs: 20 })), "ready");
});

test("cancelling readiness releases its listeners immediately", async t => {
	const island = new Island();
	installDOM(t, { islands: [island] });
	const controller = new AbortController();
	const pending = waitForThemePage({ signal: controller.signal });
	controller.abort();
	assert.equal(await settles(pending), "ready");
	assert.equal(island.listeners.size, 0);
});
