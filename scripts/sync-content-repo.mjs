import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRepo = "https://gitcode.com/2401_88020079/gitcode_knowledge.git";
const sourceBranch = "main";
const sourceDir = path.join(root, ".content-source");
const sourcePosts = path.join(sourceDir, "嵌入式笔记");
const targetPosts = path.join(root, "src", "content", "posts", "embedded", "esp32-s3");

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

if (!existsSync(sourcePosts)) {
	throw new Error(`文章仓库中不存在目录: ${sourcePosts}`);
}

rmSync(targetPosts, { recursive: true, force: true });
mkdirSync(targetPosts, { recursive: true });
cpSync(sourcePosts, targetPosts, { recursive: true });

console.log(`已同步文章: ${sourceRepo}/tree/${sourceBranch}/嵌入式笔记`);
