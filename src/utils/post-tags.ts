/** Public navigation topics, not an index of every keyword in an article. */
const tagGroups = {
	人工智能: ["AI", "AI协作"],
	"AI Agent": ["Agent SDK", "Multi-Agent", "Tool Use", "MCP", "Agent Skills", "会话管理", "上下文", "context"],
	软件工程: ["架构设计", "CMake", "构建系统", "CodeBuddy", "工程规范", "Spec-Driven", "规范驱动", "任务看板", "UI规格", "文档", "CI/CD", "工程效率", "内联编辑", "全栈"],
	Qt: ["Qt6"],
	"C++": [],
	嵌入式: ["物联网"],
	ESP32: ["ESP32-S3", "ESP-IDF"],
	FreeRTOS: [],
	通信协议: ["无线通信", "Wi-Fi", "UART", "I2C", "SPI", "BLE", "NTP", "CAN", "Modbus"],
	前端: ["HTML", "CSS"],
	JavaScript: ["ES6"],
	Vue: ["Vue2", "Vue3", "VueCli", "Vuex"],
	React: [],
	Git: ["版本控制"],
	数据库: ["SQL", "MySQL", "SQLite"],
	Docker: ["Dockerfile", "docker run", "镜像"],
	Linux: ["多进程"],
	深度学习: ["神经网络"],
	数据结构: [],
	算法: [],
	计算机组成原理: [],
	学习方法: [],
	个人成长: ["认知", "教育", "职场", "面试", "职业规划"],
	产品设计: ["产品"],
} as const;

export type PostTag = keyof typeof tagGroups;
export const POST_TAGS = Object.keys(tagGroups) as PostTag[];

const key = (value: string) =>
	value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

const aliases = new Map<string, PostTag>();
for (const topic of POST_TAGS) {
	aliases.set(key(topic), topic);
	for (const alias of tagGroups[topic]) aliases.set(key(alias), topic);
}

/** Keep subject tags for articles whose source only contains fine-grained terms. */
const categoryTopics = new Map<string, PostTag>([
	["AI工程", "人工智能"],
	["Qt学习", "Qt"],
	["物联网", "嵌入式"],
	["嵌入式", "嵌入式"],
	["通信协议", "通信协议"],
	["前端", "前端"],
	["MySQL", "数据库"],
	["Git", "Git"],
	["Docker", "Docker"],
	["Linux编程", "Linux"],
	["深度学习", "深度学习"],
	["数据结构", "数据结构"],
	["算法题解", "算法"],
	["计算机组成原理", "计算机组成原理"],
]);

export function normalizePostTags(
	tags: readonly string[],
	category?: string | null,
): PostTag[] {
	const result: PostTag[] = [];
	const add = (topic: PostTag | undefined) => {
		if (topic && !result.includes(topic) && result.length < 3)
			result.push(topic);
	};
	add(categoryTopics.get(category?.trim() ?? ""));
	for (const tag of tags) add(aliases.get(key(tag)));
	return result;
}
