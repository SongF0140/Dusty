import assert from "node:assert/strict";
import test from "node:test";
import { createChristmasBurst, createChristmasFallFrames } from "./christmas-burst.ts";

test("one click creates a bounded burst without flooding the page", () => {
	const particles = [0, 0.5, 0.999999].flatMap(value => createChristmasBurst(() => value));
	assert.equal(createChristmasBurst().length, 8);
	assert.ok(particles.every(p => ["candy", "snowflake", "bell", "star", "tree", "stocking"].includes(p.kind)));
	for (const p of particles) {
		assert.ok(Math.abs(p.x) <= 30 && p.y >= 44 && p.y <= 72);
		assert.ok(p.duration >= 480 && p.duration <= 640);
		assert.ok(p.size >= 12 && p.size <= 18);
		assert.ok(p.delay >= 0 && p.delay <= 70);
	}
});

test("random selection includes all six requested decorations and multiple stocking colors", () => {
	const particles = [0, 0.17, 0.34, 0.51, 0.68, 0.85].map(value => createChristmasBurst(() => value)[0]);
	assert.deepEqual(particles.map(p => p.kind), ["candy", "snowflake", "bell", "star", "tree", "stocking"]);
	assert.equal(new Set(particles.map(p => p.color)).size, 4);
});

test("the stream falls continuously within a small area and fades out", () => {
	for (const value of [0, 0.5, 0.999999]) {
		const frames = createChristmasFallFrames(createChristmasBurst(() => value)[0]);
		const positions = frames.map(frame => [...frame.transform.matchAll(/-50% \+ (-?[\d.]+)px/g)].map(match => Number(match[1])));
		assert.ok(positions.every(([x, y]) => Math.abs(x) <= 30 && y >= 0 && y <= 72));
		assert.ok(positions.every(([, y], i) => i === 0 || y > positions[i - 1][1]));
		assert.equal(frames[0].opacity, 0);
		assert.equal(frames.at(-1).opacity, 0);
	}
});
