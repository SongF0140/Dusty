import type { FontConfig } from "../types/fontConfig";

// 字体配置
export const fontConfig: FontConfig = {
	// 是否启用自定义字体功能
	enable: true,
	// 是否预加载字体文件
	preload: true,
	// 当前选择的字体，支持多个字体组合
	// 保持 system：正文沿用系统字体，手写体只用于 TAG / 标题等区域
	// 中文字体在 FontManager 中单独加载，不进入全局 body 字体栈
	selected: ["system"],

	// 各区域独立字体设置（填写下方 fonts 中的字体 ID，留空则使用全局 selected 字体）
	// 横幅标题字体
	bannerTitleFont: "luckiest-guy",
	// 横幅副标题字体
	bannerSubtitleFont: "",
	// 导航栏标题字体
	navbarTitleFont: "fredoka-one",

	// 字体列表
	// 推荐使用可靠的 CDN 服务商提供的字体链接，它天然做了按需分片加载，且性能较好
	//
	// 也可以使用本地字体文件，但建议开启字体子集化处理，否则会因为字体文件庞大增加带宽负担导致页面加载缓慢甚至无法加载
	// 如果进行字体子集化处理，会导致动态内容（如评论，Bangumi等）无法正确显示字体，因此不推荐使用本地字体文件
	fonts: {
		"luckiest-guy": {
			id: "luckiest-guy",
			name: "Luckiest Guy",
			src: "/fonts/luckiest-guy.woff2",
			family: "Luckiest Guy",
			format: "woff2",
			weight: 400,
			display: "swap",
		},
		// 站酷快乐体（ZCOOL KuaiLe）- 中文手写体
		// Luckiest Guy / Fredoka One 均不含中文字形，中文需回退到本字体
		// Google Fonts 已按 unicode-range 切成 93 个分片，浏览器按需加载
		"zcool-kuaile": {
			id: "zcool-kuaile",
			name: "站酷快乐体",
			src: "https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap",
			family: "ZCOOL KuaiLe",
			weight: 400,
			display: "swap" as const,
		},
		// Google Fonts - Fredoka One（圆润卡通体，仅拉丁字形，可作英文备选）
		"fredoka-one": {
			id: "fredoka-one",
			name: "Fredoka One",
			src: "https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap",
			family: "Fredoka One",
			weight: 400,
			display: "swap" as const,
		},
		// 系统字体
		system: {
			id: "system",
			name: "系统字体",
			src: "", // 系统字体无需 src
			family:
				"system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
		},

		// Google Fonts - Zen Maru Gothic
		"zen-maru-gothic": {
			id: "zen-maru-gothic",
			name: "Zen Maru Gothic",
			src: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap",
			family: "Zen Maru Gothic",
			display: "swap" as const,
		},

		// Google Fonts - Inter
		inter: {
			id: "inter",
			name: "Inter",
			src: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
			family: "Inter",
			display: "swap" as const,
		},

		// 小米字体 - MiSans Normal
		"misans-normal": {
			id: "misans-normal",
			name: "MiSans Normal",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Normal.min.css",
			family: "MiSans",
			weight: 400,
			display: "swap" as const,
		},

		// 小米字体 - MiSans Regular
		"misans-regular": {
			id: "misans-regular",
			name: "MiSans Regular",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Regular.min.css",
			family: "MiSans",
			weight: 500,
			display: "swap" as const,
		},

		// 小米字体 - MiSans Semibold
		"misans-semibold": {
			id: "misans-semibold",
			name: "MiSans Semibold",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Semibold.min.css",
			family: "MiSans",
			weight: 600,
			display: "swap" as const,
		},

		// ========== 本地字体示例（启用子集化） ==========
		// 使用步骤：
		// 1. 将 TTF/OTF/WOFF2 字体文件放在 public/fonts/ 目录下
		// 2. 取消下方注释并填写正确的字体信息
		// 3. 运行 pnpm build，脚本会自动扫描页面字符并生成轻量 woff2 子集
		// 注意：子集化仅包含构建时页面中出现的字符，评论等动态加载内容可能字体缺失
		//       可通过 subsetExtraChars 补充额外字符来缓解
		//
		// "misans-test": {
		// 	id: "misans-test",
		// 	name: "MiSans Test",
		// 	src: "/fonts/MiSans-Test.woff2",
		// 	family: "MiSans",
		// 	weight: 400,
		// 	display: "swap" as const,
		// 	subset: true, // 启用子集化
		// 	subsetExtraChars: "",
		// },
	},

	// 全局字体回退
	// 顺序很重要：浏览器逐字符回退，英文走 Luckiest Guy，中文落到站酷快乐体
	fallback: [
		"ZCOOL KuaiLe",
		"system-ui",
		"-apple-system",
		"BlinkMacSystemFont",
		"Segoe UI",
		"Roboto",
		"sans-serif",
	],
};
