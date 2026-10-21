import assert from "node:assert/strict";
import test from "node:test";
import * as garden from "./garden-companion-motion.ts";

const ids = [
	"bubbles",
	"tea",
	"cooking",
	"moon",
	"sleep",
	"gardening",
	"flute",
];

test("a new flip chooses a different scene, including random endpoint values", () => {
	assert.equal(typeof garden.chooseGardenScene, "function");
	for (const previous of ids) {
		for (const sample of [0, 0.1, 0.5, 0.999999, 1]) {
			const next = garden.chooseGardenScene(previous, () => sample);
			assert.ok(ids.includes(next));
			assert.notEqual(next, previous);
		}
	}
});

test("only tea has a tea table; gardening stands to prune a vine column", () => {
	assert.ok(garden.GARDEN_SCENES);
	assert.deepEqual(Object.keys(garden.GARDEN_SCENES), ids);
	assert.deepEqual(
		ids.filter((id) => garden.GARDEN_SCENES[id].props === "tea-table"),
		["tea"],
	);
	assert.equal(garden.GARDEN_SCENES.gardening.props, "vine-column");
	assert.equal(garden.GARDEN_SCENES.gardening.posture, "standing");
});

for (const id of ids) {
	test(`${id} loops its own activity without switching scene or posture`, () => {
		const motion = new garden.GardenMotion(id);
		const posture = motion.current.posture;
		for (let n = 0; n < 250; n++) {
			assert.equal(motion.current.scene, id);
			assert.equal(motion.current.action, id);
			assert.equal(motion.current.posture, posture);
			assert.equal(motion.current.row, 0);
			assert.ok(motion.current.column >= 0 && motion.current.column < 4);
			motion.advance();
		}
	});

	for (const kind of ["smile", "tilt", "wave"]) {
		test(`${id}: ${kind} preserves props and returns to the exact activity frame`, () => {
			const motion = new garden.GardenMotion(id);
			motion.advance();
			motion.advance();
			const before = motion.current;
			const allowed =
				!["cooking", "sleep", "gardening", "flute"].includes(id) ||
				kind !== "wave";
			assert.equal(motion.react(kind), allowed);
			if (!allowed) {
				assert.deepEqual(motion.current, before);
				return;
			}
			assert.equal(
				motion.react("smile"),
				false,
				"rapid clicks cannot stack or restart a greeting",
			);
			const seen = new Set();
			for (let n = 0; n < 10 && motion.current.reaction !== "none"; n++) {
				assert.equal(motion.current.scene, id);
				assert.equal(motion.current.posture, before.posture);
				seen.add(motion.current.frameIndex);
				motion.advance();
			}
			assert.ok(seen.has(kind === "smile" ? 4 : kind === "tilt" ? 5 : 6));
			assert.deepEqual(motion.current, before);
		});
	}
}

test("greeting selection never waves with occupied hands and avoids repeating the last greeting", () => {
	assert.equal(typeof garden.chooseGardenReaction, "function");
	for (const id of ids) {
		for (const previous of ["smile", "tilt", "wave"]) {
			for (const sample of [0, 0.5, 0.999999]) {
				const next = garden.chooseGardenReaction(id, previous, () => sample);
				assert.notEqual(next, previous);
				if (["cooking", "sleep", "gardening", "flute"].includes(id))
					assert.notEqual(next, "wave");
			}
		}
	}
});
