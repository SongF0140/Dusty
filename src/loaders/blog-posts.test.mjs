import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { blogPostsLoader } from "./blog-posts.ts";

test("content loader populates description, reuses summary cache and refreshes changed bodies", async () => {
	const dir = await mkdtemp(join(tmpdir(), "blog-loader-"));
	try {
		const file = join(dir, "git.md");
		const content = "---\ntitle: Git\n---\n# 暂存\n保留工作区修改。";
		await writeFile(file, content);
		let calls = 0;
		let result;
		const cache = new Map();
		const loader = blogPostsLoader({
			env: {
				BLOG_LLM_BASE_URL: "https://mock.invalid/v1",
				BLOG_LLM_MODEL: "chosen",
				BLOG_LLM_API_KEY: "fake",
			},
			store: {
				get: async (id) => cache.get(id),
				put: async (id, value) => {
					cache.set(id, value);
				},
			},
			fetch: async (_url, init) => {
				calls++;
				assert.ok(
					!JSON.parse(init.body).messages.at(-1).content.includes("title: Git"),
				);
				return Response.json({
					choices: [
						{ message: { content: "本文介绍暂存区与工作区之间的关系。" } },
					],
				});
			},
			source: {
				name: "test-source",
				load: async (context) => {
					result = await context.parseData({
						id: "git",
						filePath: file,
						data: { title: "Git", description: "原简介" },
					});
				},
			},
		});
		const context = {
			config: { root: pathToFileURL(`${dir}/`) },
			logger: { info() {} },
			generateDigest: (value) => String(value),
			parseData: async ({ data }) => data,
		};
		await loader.load(context);
		await loader.load(context);
		assert.equal(calls, 1);
		assert.equal(result.summaryGenerated, true);
		assert.equal(result.description, "本文介绍暂存区与工作区之间的关系。");
		await writeFile(file, `${content}\n新增内容`);
		await loader.load(context);
		assert.equal(calls, 2);
		assert.equal(result.summaryGenerated, true);
		assert.equal(result.description, "本文介绍暂存区与工作区之间的关系。");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
