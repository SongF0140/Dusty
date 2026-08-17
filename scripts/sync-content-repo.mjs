import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRepo = "https://gitcode.com/2401_88020079/gitcode_knowledge.git";
const sourceBranch = "main";
const sourceDir = path.join(root, ".content-source");
const syncTargets = [
	{
		source: "嵌入式笔记",
		target: path.join(root, "src", "content", "posts", "embedded", "esp32-s3"),
	},
	{
		source: "QT学习笔记",
		target: path.join(root, "src", "content", "posts", "qt"),
	},
];

if (existsSync(path.join(sourceDir, ".git"))) {
	execFileSync("git", ["-C", sourceDir, "fetch", "--depth", "1", "origin", sourceBranch], {
		stdio: "inherit",
	});
	execFileSync("git", ["-C", sourceDir, "reset", "--hard", `origin/${sourceBranch}`], {
		stdio: "inherit",
	});
} else {
	rmSync(sourceDir, { recursive: true, force: true });
	execFileSync("git", ["clone", "--depth", "1", "--branch", sourceBranch, sourceRepo, sourceDir], {
		stdio: "inherit",
	});
}

for (const item of syncTargets) {
	const sourcePosts = path.join(sourceDir, item.source);
	if (!existsSync(sourcePosts)) {
		throw new Error(`文章仓库中不存在目录: ${sourcePosts}`);
	}

	rmSync(item.target, { recursive: true, force: true });
	mkdirSync(path.dirname(item.target), { recursive: true });
	symlinkSync(sourcePosts, item.target, "junction");

	console.log(`已链接文章目录: ${sourceRepo}/tree/${sourceBranch}/${item.source} -> ${item.target}`);
}
