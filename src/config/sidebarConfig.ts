import type { SidebarLayoutConfig } from "../types/sidebarConfig";

export const sidebarLayoutConfig: SidebarLayoutConfig = {
	enable: true,
	position: "both",
	tabletSidebar: "left",
	showBothSidebarsOnPostPage: true,
	leftComponents: [
		{ type: "profile", enable: true, position: "top", showOnPostPage: false },
		{ type: "categories", enable: true, position: "sticky", showOnPostPage: false, specificConfig: { collapseThreshold: 5 } },
		{ type: "sidebarToc", enable: true, position: "sticky", showOnPostPage: true, showOnNonPostPage: false },
	],
	rightComponents: [
		{ type: "stats", enable: true, showTitle: false, position: "top", showOnPostPage: false },
		{ type: "siteInfo", enable: true, position: "top", showOnPostPage: false, specificConfig: { siteInfo: { unknownBuildPlatform: "Unknown CI" } } },
		{ type: "music", enable: true, position: "sticky", showOnPostPage: false },
		{ type: "readingNotes", enable: true, position: "sticky", showOnPostPage: true, showOnNonPostPage: false },
	],
	mobileBottomComponents: [
		{ type: "readingNotes", enable: true, showOnPostPage: true, showOnNonPostPage: false },
		{ type: "profile", enable: true, showOnPostPage: false },
		{ type: "music", enable: true, showOnPostPage: false },
		{ type: "categories", enable: true, showOnPostPage: false, specificConfig: { collapseThreshold: 5 } },
		{ type: "stats", enable: true, showTitle: false, showOnPostPage: false },
		{ type: "siteInfo", enable: true, showOnPostPage: false, specificConfig: { siteInfo: { unknownBuildPlatform: "Unknown CI" } } },
	],
};
