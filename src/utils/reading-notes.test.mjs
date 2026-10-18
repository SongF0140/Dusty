import assert from "node:assert/strict";
import test from "node:test";
import { loadReadingNote, saveReadingNote, readingNoteKey } from "./reading-notes.ts";

test("reading notes persist separately for each article and normalize URLs", () => {
    const values = new Map();
    const store = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    assert.equal(saveReadingNote(store, "/posts/笔记/", "一个疑问\n稍后实验"), true);
    assert.equal(loadReadingNote(store, "/posts/%E7%AC%94%E8%AE%B0#section"), "一个疑问\n稍后实验");
    assert.equal(loadReadingNote(store, "/posts/other/"), "");
    saveReadingNote(store, "/posts/other/", "另一个想法");
    saveReadingNote(store, "/posts/笔记", "");
    assert.equal(loadReadingNote(store, "/posts/笔记/"), "");
    assert.equal(loadReadingNote(store, "/posts/other/"), "另一个想法");
    assert.equal(readingNoteKey("/posts/a/?q=1"), readingNoteKey("/posts/a"));
});
test("storage failures report failure without throwing or claiming a save", () => {
    const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("quota"); }, removeItem() { throw Error("blocked"); } };
    assert.equal(loadReadingNote(blocked, "/posts/a"), "");
    assert.equal(saveReadingNote(blocked, "/posts/a", "note"), false);
});
