import type { Live2DWidgetConfig } from "../types/pioConfig";

// Live2D 看板娘配置 (使用 l2d-widget 库，文档：https://l2d-widget.hacxy.cn)
export const live2dWidgetConfig: Live2DWidgetConfig = {
	// Live2D 看板娘开关
	enable: false,
	// 模型配置，支持单个模型或数组（多模型切换）
	model: [
		{
			// Live2D模型本地文件路径
			path: "/pio/models/live2d/snow_miku/model.json",
			// 动作声音音量 范围0~1，默认 0（静音）
			volume: 0,
			// 模型缩放比例
			scale: 1,
			// X轴偏移，范围 -2~2，正值向右
			x: 0,
			// Y轴偏移，范围 -2~2，正值向上
			y: 0,
		},
		{
			// 外部直连模型
			path: "https://model.hacxy.cn/cat-black/model.json",
			volume: 0,
			scale: 1,
			x: 0,
			y: 0,
		},
	],
	// 显示位置：bottom-left 或 bottom-right
	position: "bottom-left" as const,
	// 画布尺寸（px）
	size: { width: 200, height: 200 },
	// 主题色，用于菜单、状态条等 UI 元素的背景色，默认 'rgba(96,165,250,0.9)'
	primaryColor: "var(--l2d-msg-bg)",
	// 入场/退场动画时长（ms）
	transitionDuration: 1500,
	// 入场/退场动画类型
	transitionType: "slide" as const,
	// 菜单配置
	menus: {
		// 完全替换默认菜单项
		items: [
			{
				icon: "mdi:home",
				label: "返回主页",
				action: "home",
			},
			{
				icon: "mdi:arrow-up",
				label: "返回顶部",
				action: "scrollToTop",
			},
			{
				icon: "mdi:bed",
				label: "休眠",
				action: "sleep",
			},
			{
				icon: "mdi:swap-horizontal",
				label: "切换模型",
				action: "switchModel",
			},
			{
				icon: "mdi:github",
				label: "GitHub",
				action: "github",
			},
		],
		// 菜单对齐方式
		align: "right" as const,
	},
	// 提示气泡配置
	tips: {
		// 气泡开关
		enable: true,
		// 初始欢迎消息
		welcomeMessage: ["你好，旅人。", "欢迎来到 Dusty 的技术小站。"],
		// 循环提示内容
		messages: [
			"有什么需要帮助的吗？",
			"今天天气真不错呢！",
			"要不要一起玩游戏？",
			"记得按时休息哦！",
		],
		// 文字显示时间（ms）
		duration: 3000,
		// 提示气泡切换间隔（ms）
		interval: 6000,
		// 位置偏移量（px），基于默认位置（模型正上方居中）进行微调
		offset: {
			x: 0, // 正值右移，负值左移
			y: 0, // 正值下移，负值上移
		},
	},
	// 响应式配置
	responsive: {
		// 在移动端隐藏
		hideOnMobile: true,
		// 移动端断点
		mobileBreakpoint: 768,
	},
};
