import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, ".content-source");
const sourceKnowledge = path.join(sourceRoot, "knowledge");
const fireflyKnowledge = path.join(root, "src", "content", "posts", "knowledge");
// 检查目标目录是否存在
if (!existsSync(sourceRoot)) {
	throw new Error(".content-source 不存在，无法同步到文章源仓库");
}
// 先删除目标目录，确保同步是全量的
rmSync(sourceKnowledge, { recursive: true, force: true });
// 硶盖同步知识文章
cpSync(fireflyKnowledge, sourceKnowledge, { recursive: true });
// 打印同步日志
console.log(`已同步知识文章: ${fireflyKnowledge} -> ${sourceKnowledge}`);
