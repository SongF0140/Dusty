import assert from "node:assert/strict";
import test from "node:test";
import { getReadingProgress, getCurrentHeadingIndex, getReadingMarkerGeometry } from "./reading-progress.ts";

test("progress is clamped before the article and complete when its end is visible", () => {
	assert.equal(getReadingProgress(500, 2200, 800, 140), 0);
	assert.equal(getReadingProgress(140, 2200, 800, 140), 0);
	assert.equal(getReadingProgress(-630, 2200, 800, 140), 0.5);
	assert.equal(getReadingProgress(-1400, 2200, 800, 140), 1);
	assert.equal(getReadingProgress(-3000, 2200, 800, 140), 1);
});

test("short and empty articles never produce invalid progress values", () => {
	assert.equal(getReadingProgress(200, 300, 800, 140), 1);
	assert.equal(getReadingProgress(900, 300, 800, 140), 0);
	assert.equal(getReadingProgress(100, 0, 800, 140), 0);
});

test("the directory follows the last section reached, not the next visible heading", () => {
	assert.equal(getCurrentHeadingIndex([300, 600, 900], 112), 0);
	assert.equal(getCurrentHeadingIndex([-300, 80, 500], 112), 1);
	assert.equal(getCurrentHeadingIndex([-800, -400, 112], 112), 2);
	assert.equal(getCurrentHeadingIndex([-800, -400, -100], 112), 2);
	assert.equal(getCurrentHeadingIndex([], 112), -1);
});

test("the filled track ends at the marker and an offscreen section has no fake endpoint marker", () => {
	assert.deepEqual(getReadingMarkerGeometry(100, 40, 0, 300), { top: 106, fillHeight: 120, visible: true });
	assert.deepEqual(getReadingMarkerGeometry(-50, 20, 0, 300), { top: 0, fillHeight: 0, visible: false });
	assert.deepEqual(getReadingMarkerGeometry(350, 20, 0, 300), { top: 272, fillHeight: 300, visible: false });
});
