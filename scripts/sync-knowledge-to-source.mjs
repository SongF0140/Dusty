import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, ".content-source");
const sourceKnowledge = path.join(sourceRoot, "knowledge");
const fireflyKnowledge = path.join(root, "src", "content", "posts", "knowledge");

if (!existsSync(sourceRoot)) {
	throw new Error(".content-source 不存在，无法同步到文章源仓库");
}

rmSync(sourceKnowledge, { recursive: true, force: true });
cpSync(fireflyKnowledge, sourceKnowledge, { recursive: true });

console.log(`已同步知识文章: ${fireflyKnowledge} -> ${sourceKnowledge}`);
