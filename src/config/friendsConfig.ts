import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

// 页面布局与配置生成表单位于 src/pages/friends.astro。

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示申请友链表单与配置预览
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,
};

// 真实友链。category 可选：熟人、友链小伙伴、单向关注。
export const friendsConfig: FriendLink[] = [
	{
		title: "belluna",
		imgurl: "https://belluna.love/_astro/avatar.CDGnQpej_2bNC6X.avif",
		desc: "记录生活与技术，铃月和我共同存在的地方",
		siteurl: "https://belluna.love",
		tags: ["生活", "技术"],
		category: "熟人",
		owner: "jianyanya",
		color: "#972F2F",
		weight: 10,
		enabled: true,
	},
	{
		title: "栀子苒",
		imgurl: "https://zzran.online/favicon.svg",
		desc: "喵喵喵",
		siteurl: "https://zzran.online/",
		tags: ["博客"],
		category: "友链小伙伴",
		owner: "栀子苒",
		color: "#8cae91",
		weight: 9,
		enabled: true,
	},
];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};

