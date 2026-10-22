import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("built metadata, chunk index and server corpus describe the same current public posts", async () => {
	const read = async (name) =>
		JSON.parse(await readFile(`dist/api/rag/${name}.json`, "utf8"));
	const [articles, index, corpus] = await Promise.all([
		read("articles"),
		read("chunks"),
		read("corpus"),
	]);
	assert.equal(index.version, 1);
	assert.ok(index.revision);
	assert.equal(articles.length, corpus.length);
	assert.equal(index.documents.length, articles.length);
	for (const article of articles) {
		const document = index.documents.find((item) => item.id === article.id);
		const source = corpus.find((item) => item.id === article.id);
		assert.ok(document);
		assert.ok(source);
		assert.equal(article.description, document.description);
		assert.equal(article.revision, document.revision);
		assert.equal(article.chunkCount, document.chunks.length);
		assert.equal(article.body, undefined);
		assert.equal(article.chunks, undefined);
		for (const chunk of document.chunks) {
			assert.ok(chunk.text.length <= 1600);
			assert.equal(source.body.slice(chunk.start, chunk.end), chunk.text);
			assert.equal(chunk.postId, article.id);
		}
	}
});
