import assert from "node:assert/strict";
import test from "node:test";
import * as postArt from "./post-card-art.ts";

const { PostArtShuffleBag } = postArt;

test("each group of thirteen cards gets all thirteen pictures", () => {
	const picker = new PostArtShuffleBag(() => 0.42);
	for (let group = 0; group < 8; group++) {
		const art = Array.from({ length: 13 }, () => picker.next());
		assert.deepEqual([...art].sort((a, b) => a - b), Array.from({ length: 13 }, (_, i) => i));
	}
});

test("adjacent pictures never repeat, including across shuffle boundaries", () => {
	for (const sample of [0, 0.5, 0.999999]) {
		const picker = new PostArtShuffleBag(() => sample);
		let previous;
		for (let i = 0; i < 250; i++) {
			const current = picker.next();
			assert.ok(current >= 0 && current < 13);
			assert.notEqual(current, previous);
			previous = current;
		}
	}
});

test("a fresh visit starts with a different picture from the last visit", () => {
	for (let previous = 0; previous < 13; previous++) {
		for (const sample of [0, 0.5, 0.999999]) {
			const picker = new PostArtShuffleBag(() => sample, previous);
			assert.notEqual(picker.next(), previous);
		}
	}
});

test("visits remember only the opening picture, even after later cards render", () => {
	assert.equal(typeof postArt.createVisitArtPicker, "function");
	const values = new Map();
	const storage = {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
	};
	let previous;
	for (let visit = 0; visit < 12; visit++) {
		const picker = postArt.createVisitArtPicker(storage, () => 0.5);
		const first = picker.next();
		assert.notEqual(first, previous);
		for (let card = 0; card < 12; card++) picker.next();
		assert.equal(storage.getItem(postArt.POST_ART_VISIT_KEY), String(first));
		previous = first;
	}
});

test("unavailable or invalid browser storage still yields usable pictures", () => {
	assert.equal(typeof postArt.createVisitArtPicker, "function");
	const blocked = {
		getItem() {
			throw Error("blocked");
		},
		setItem() {
			throw Error("blocked");
		},
	};
	for (const storage of [
		null,
		blocked,
		{ getItem: () => "invalid", setItem() {} },
	]) {
		const picker = postArt.createVisitArtPicker(storage, () => 0.5);
		const values = Array.from({ length: 13 }, () => picker.next());
		assert.equal(new Set(values).size, 13);
	}
});

test("all thirteen pictures resolve to the correct atlas and column", () => {
	const expected = [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]];
	for (let index = 0; index < 13; index++) {
		const result = postArt.resolvePostArt(index, [4,3,3,3]);
		assert.deepEqual([result.sheetIndex, result.column], expected[index]);
	}
	for (const index of [-1, 13, 0.5]) assert.throws(() => postArt.resolvePostArt(index, [4,3,3,3]), RangeError);
});
