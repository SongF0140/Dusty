import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { syncContent } from "./sync-content-repo.mjs";

function git(dir, ...args) {
	return execFileSync("git", ["-C", dir, ...args], {
		encoding: "utf-8",
	}).trim();
}

function write(dir, name, content) {
	const file = path.join(dir, name);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, content);
}

function commit(dir) {
	git(dir, "add", ".");
	git(
		dir,
		"-c",
		"user.name=Sync Test",
		"-c",
		"user.email=sync@example.invalid",
		"commit",
		"-m",
		"fixture",
	);
}

test("sync migrates cached origin, preserves local posts and supports repeat builds", () => {
	const fixture = mkdtempSync(path.join(tmpdir(), "firefly-sync-"));
	const root = path.join(fixture, "site");
	const previous = path.join(fixture, "old-source");
	const source = path.join(fixture, "source");
	const dirs = [
		"嵌入式笔记",
		"QT学习笔记",
		"前端碎碎念",
		"MYSQL笔记",
		"GIT笔记",
	];
	try {
		for (const dir of [root, previous, source]) {
			mkdirSync(dir, { recursive: true });
			git(dir, "init", "-b", "main");
		}
		write(root, ".gitignore", ".content-source/\n.content-sync-state.json\n");
		write(root, "src/content/posts/knowledge/local.md", "# Local knowledge\n");
		commit(root);
		write(previous, "README.md", "Previous source\n");
		commit(previous);
		for (const dir of dirs) write(source, `${dir}/new.md`, "# New note\n");
		write(source, "通信协议/01-CAN.md", "# CAN\n");
		write(source, ".obsidian/private.md", "# Do not publish\n");
		commit(source);
		git(root, "clone", previous, ".content-source");

		syncContent({ root, sourceRepo: source });
		assert.equal(
			git(path.join(root, ".content-source"), "remote", "get-url", "origin"),
			source,
		);
		assert.equal(
			readFileSync(
				path.join(root, "src/content/posts/knowledge/local.md"),
				"utf-8",
			),
			"# Local knowledge\n",
		);
		const generated = path.join(root, "src/content/posts/通信协议/01-CAN.md");
		assert.match(readFileSync(generated, "utf-8"), /^---\ntitle: "CAN"/);
		assert.match(
			readFileSync(
				path.join(root, "src/content/posts/frontend/new.md"),
				"utf-8",
			),
			/^---\n/,
		);
		assert.equal(
			readFileSync(path.join(source, "通信协议/01-CAN.md"), "utf-8"),
			"# CAN\n",
		);

		write(source, "通信协议/01-CAN.md", "# CAN\nUpdated remotely\n");
		commit(source);
		syncContent({ root, sourceRepo: source });
		assert.match(readFileSync(generated, "utf-8"), /Updated remotely/);

		writeFileSync(generated, "# Unsaved local changes\n");
		assert.throws(
			() => syncContent({ root, sourceRepo: source }),
			/存在未提交/,
		);
		assert.equal(readFileSync(generated, "utf-8"), "# Unsaved local changes\n");
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
});

test("public build and check commands sync explicitly", () => {
	const pkg = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
	);
	for (const script of ["dev", "build", "check"]) {
		assert.ok(pkg.scripts[script].startsWith("pnpm run sync-content && "));
		assert.equal(pkg.scripts[`pre${script}`], undefined);
	}
});
