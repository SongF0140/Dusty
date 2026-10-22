import assert from "node:assert/strict";
import test from "node:test";
import { createProgressiveText } from "./progressive-text.ts";

test("reveals complete graphemes, pauses, resumes and stops on disposal", () => {
	const tasks = new Map();
	let serial = 0;
	const frames = [];
	const writer = createProgressiveText(
		"海👩‍💻香",
		(text, done) => frames.push({ text, done }),
		{
			schedule: (fn) => {
				tasks.set(++serial, fn);
				return serial;
			},
			cancel: (id) => tasks.delete(id),
		},
	);
	const tick = () => {
		const [id, fn] = tasks.entries().next().value;
		tasks.delete(id);
		fn();
	};
	writer.resume();
	tick();
	assert.equal(frames.at(-1).text, "海");
	writer.pause();
	assert.equal(tasks.size, 0);
	writer.resume();
	tick();
	assert.equal(frames.at(-1).text, "海👩‍💻");
	tick();
	assert.deepEqual(frames.at(-1), { text: "海👩‍💻香", done: true });
	writer.stop();
	assert.equal(tasks.size, 0);
});
test("reduced motion can finish immediately without a timer", () => {
	let output = "";
	const writer = createProgressiveText("完整摘要", (text) => (output = text), {
		schedule: () => assert.fail("no timer"),
		cancel: () => {},
	});
	writer.finish();
	assert.equal(output, "完整摘要");
	writer.resume();
	assert.equal(output, "完整摘要");
});
