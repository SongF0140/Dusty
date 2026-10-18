import assert from "node:assert/strict";
import test from "node:test";
import { showPageSkeleton, hidePageSkeleton } from "./page-loading.ts";

test("overlapping navigation and theme changes keep the skeleton until both finish", () => {
	const attrs = new Map();
	const classes = new Set();
	const styles = new Map();
	const skeleton = { hidden: true, dataset: {}, style: { setProperty: (key, value) => styles.set(key, value), removeProperty: key => styles.delete(key) } };
	const content = {
		inert: false,
		setAttribute: (key, value) => attrs.set(key, value),
		removeAttribute: (key) => attrs.delete(key),
	};
	const shell = { getBoundingClientRect: () => ({ top: -2000 }), querySelector: () => skeleton, classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } };
	const previousDocument = globalThis.document;
	const previousLocation = globalThis.location;
	globalThis.document = { getElementById: (id) => id === "page-content-shell" ? shell : id === "navbar" ? { getBoundingClientRect: () => ({ bottom: 72 }) } : content };
	globalThis.location = { href: "http://localhost/" };
	try {
		showPageSkeleton("/archive/");
		showPageSkeleton("/archive/", "theme");
		assert.equal(skeleton.hidden, false);
		assert.equal(skeleton.dataset.layout, "list");
		assert.equal(content.inert, true);
		assert.equal(attrs.get("aria-busy"), "true");
		hidePageSkeleton("theme");
		assert.equal(skeleton.hidden, false);
		assert.equal(content.inert, true);
		hidePageSkeleton();
		assert.equal(skeleton.hidden, true);
		assert.equal(content.inert, false);
		assert.equal(attrs.has("aria-busy"), false);
		assert.equal(classes.size, 0);
		// Switching while reading deep in an article aligns below the actual navbar,
		// and every completed switch clears both the overlay position and busy state.
		for (let i = 0; i < 3; i++) {
			showPageSkeleton("/posts/example/", "theme");
			assert.equal(styles.get("--skeleton-offset"), "2080px");
			assert.equal(skeleton.dataset.layout, "article");
			assert.equal(classes.has("is-content-loading"), true);
			hidePageSkeleton("theme");
			assert.equal(skeleton.hidden, true);
			assert.equal(styles.size, 0);
			assert.equal(classes.size, 0);
			assert.equal(content.inert, false);
			assert.equal(attrs.has("aria-busy"), false);
		}
	} finally {
		globalThis.document = previousDocument;
		globalThis.location = previousLocation;
	}
});
