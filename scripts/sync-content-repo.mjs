import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRepo = "https://gitcode.com/2401_88020079/gitcode_knowledge.git";
const sourceBranch = "main";
const sourceDir = path.join(root, ".content-source");

// 每个同步项可选携带 frontmatter：源仓库中这些笔记缺少 frontmatter，
// 无法被 Astro 内容集合收录，同步时按文件名补上（已存在 frontmatter 时跳过）。
const syncTargets = [
	{
		source: "嵌入式笔记",
		target: path.join(root, "src", "content", "posts", "embedded", "esp32-s3"),
	},
	{
		source: "QT学习笔记",
		target: path.join(root, "src", "content", "posts", "qt"),
	},
	{
		source: "前端碎碎念",
		target: path.join(root, "src", "content", "posts", "frontend"),
		category: "前端",
		frontmatter: {
			"01-html-css.md": {
				title: "前端笔记 · HTML 与 CSS",
				description: "后端视角补前端基础：HTML 结构、常用标签与 CSS 选择器、布局的核心概念。",
				tags: ["前端", "HTML", "CSS"],
			},
			"02-js.md": {
				title: "前端笔记 · JavaScript",
				description: "JavaScript 基础与 ES6+ 新语法：变量、函数、对象、数组、模块与异步，为阅读框架代码打底。",
				tags: ["前端", "JavaScript", "ES6"],
			},
			"03-vue2.md": {
				title: "前端笔记 · Vue 2",
				description: "Vue 2 学习笔记：VueCli、Vuex、VueRouter 与 ElementUI，覆盖组件、指令、路由与状态管理。",
				tags: ["前端", "Vue2", "VueCli", "Vuex"],
			},
			"04-vue3.md": {
				title: "前端笔记 · Vue 3",
				description: "Vue 3 学习笔记：Composition API、Vite、TypeScript 与常用生态，从 Vue2 平滑过渡。",
				tags: ["前端", "Vue3", "Vite", "TypeScript"],
			},
			"05-react.md": {
				title: "前端笔记 · React",
				description: "React 学习笔记：函数式组件与 Hooks、Redux、ReactRouter 与 MobX，三大框架之 React 篇。",
				tags: ["前端", "React", "Hooks", "Redux"],
			},
		},
	},
	{
		source: "MYSQL笔记",
		target: path.join(root, "src", "content", "posts", "mysql"),
		category: "MySQL",
		frontmatter: {
			"01-数据库与表基础.md": {
				title: "MySQL 数据库与表基础",
				description: "关系型数据库分类、建库建表与常用字段类型，打牢 SQL 基础。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"02-insert插入数据.md": {
				title: "MySQL INSERT 插入数据",
				description: "INSERT 插入单行、多行数据与常见注意事项。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"03-update更新数据.md": {
				title: "MySQL UPDATE 更新数据",
				description: "UPDATE 更新数据、条件过滤与安全更新。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"04-delete删除数据.md": {
				title: "MySQL DELETE 删除数据",
				description: "DELETE 删除数据、条件过滤与截断表的区别。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"05-select基础查询与where.md": {
				title: "MySQL SELECT 基础查询与 WHERE",
				description: "SELECT 基础查询、字段筛选与 WHERE 条件过滤。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"06-排序分页与聚合查询.md": {
				title: "MySQL 排序分页与聚合查询",
				description: "ORDER BY、LIMIT 分页与 COUNT/SUM/AVG 等聚合函数。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"07-多表关系与外键.md": {
				title: "MySQL 多表关系与外键",
				description: "多表关系建模、外键约束与引用完整性。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"08-联表查询join.md": {
				title: "MySQL 联表查询 JOIN",
				description: "INNER/LEFT/RIGHT JOIN 联表查询详解。",
				tags: ["MySQL", "SQL", "数据库"],
			},
			"09-分组查询与子查询.md": {
				title: "MySQL 分组查询与子查询",
				description: "GROUP BY 分组、HAVING 过滤与子查询。",
				tags: ["MySQL", "SQL", "数据库"],
			},
		},
	},
	{
		source: "GIT笔记",
		target: path.join(root, "src", "content", "posts", "git"),
		category: "Git",
		frontmatter: {
			"solo-01-基础操作.md": {
				title: "Git 基础操作",
				description: "工作区、暂存区与版本库，Git 单人开发基础操作。",
				tags: ["Git", "版本控制"],
			},
			"solo-02-分支管理.md": {
				title: "Git 分支管理",
				description: "分支创建、切换、合并与单人分支工作流。",
				tags: ["Git", "版本控制"],
			},
			"solo-03-撤销与回退.md": {
				title: "Git 撤销与回退",
				description: "git restore/reset/revert 撤销与回退的正确姿势。",
				tags: ["Git", "版本控制"],
			},
			"solo-04-远程与标签.md": {
				title: "Git 远程仓库与标签",
				description: "远程仓库关联、推送拉取与标签管理。",
				tags: ["Git", "版本控制"],
			},
			"team.md": {
				title: "Git 团队协作心得",
				description: "团队协作流程：fetch 先行、分支隔离与合并审查。",
				tags: ["Git", "版本控制"],
			},
		},
	},
];

const published = "2026-08-21";

function injectFrontmatter(item, sourcePosts) {
	if (!item.frontmatter) return;

	for (const [file, meta] of Object.entries(item.frontmatter)) {
		const filePath = path.join(sourcePosts, file);
		if (!existsSync(filePath)) continue;

		const content = readFileSync(filePath, "utf-8");
		if (content.trimStart().startsWith("---")) continue;

		const frontmatter = [
			"---",
			`title: "${meta.title}"`,
			`published: ${published}`,
			`description: "${meta.description}"`,
			`tags: ${JSON.stringify(meta.tags)}`,
			`category: ${item.category}`,
			"draft: false",
			"---",
			"",
		].join("\n");

		writeFileSync(filePath, frontmatter + content);
		console.log(`已补充 frontmatter: ${file}`);
	}
}

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

	injectFrontmatter(item, sourcePosts);

	rmSync(item.target, { recursive: true, force: true });
	mkdirSync(path.dirname(item.target), { recursive: true });
	symlinkSync(sourcePosts, item.target, "junction");

	console.log(`已链接文章目录: ${sourceRepo}/tree/${sourceBranch}/${item.source} -> ${item.target}`);
}
