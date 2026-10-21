import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
	// 头像 - 恩奇都(Enkidu) 微笑肖像
	avatar: "assets/images/profile/author-portrait.png",

	// 名字
	name: "JIA",

	// 个人签名
	bio: "深度学习 & 计算机底层原理 | 用代码理解世界",

	// 链接配置
	links: [
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/SongF0140",
			showName: false,
		},
		{
			name: "Email",
			icon: "fa7-solid:envelope",
			url: "mailto:15271810140@163.com",
			showName: false,
		},
		{
			name: "QQ",
			icon: "fa7-brands:qq",
			url: "https://wpa.qq.com/msgrd?v=3&uin=1395543336&site=qq&menu=yes",
			showName: false,
		},
	],
};
