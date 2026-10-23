import assert from "node:assert/strict";
import test from "node:test";
import { serializeFontFamily } from "./font-family.ts";

test("system stacks remain separate families and preserve generic keywords", () => {
 assert.equal(serializeFontFamily("system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"), 'system-ui, "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", sans-serif');
});
test("custom and already quoted families retain their proper names", () => {
 assert.equal(serializeFontFamily('"Luckiest Guy", ZCOOL KuaiLe, sans-serif'), '"Luckiest Guy", "ZCOOL KuaiLe", sans-serif');
 assert.equal(serializeFontFamily('"Font, With Comma", serif'), '"Font, With Comma", serif');
});
