// Live2D 看板娘配置 (使用 l2d-widget)
export type Live2DWidgetConfig = {
	enable: boolean; // 是否启用 Live2D 看板娘
	model:
		| { path: string; volume?: number; scale?: number; x?: number; y?: number }
		| {
				path: string;
				volume?: number;
				scale?: number;
				x?: number; // X轴偏移，范围 -2~2，正值向右
				y?: number; // Y轴偏移，范围 -2~2，正值向上
		  }[]; // 模型配置，支持单个或多个模型
	position?: "bottom-left" | "bottom-right"; // 显示位置，默认 "bottom-left"
	size?: number | { width: number; height: number }; // 画布尺寸（px），默认 300
	primaryColor?: string; // 主题色，用于菜单、状态条等 UI 元素
	transitionDuration?: number; // 入场/退场动画时长（ms），默认 1500
	transitionType?: "slide" | "fade"; // 入场/退场动画类型，默认 "slide"
	menus?: {
		items?: { icon?: string; label: string; action: string }[]; // 完全替换默认菜单项
		extraItems?: { icon?: string; label: string; action: string }[]; // 追加到默认菜单末尾
		align?: "left" | "right"; // 菜单对齐方式，默认 "right"
	};
	tips?: {
		enable?: boolean; // 气泡开关，默认 true
		welcomeMessage?: string[]; // 欢迎语
		messages?: string[]; // 循环提示内容
		duration?: number; // 每条提示展示时长（ms），默认 3000
		interval?: number; // 提示循环间隔（ms），默认 5000
		offset?: { x?: number; y?: number }; // 位置偏移量（px）
		typing?: {
			param?: string; // 嘴型参数名
			speed?: number; // 打字速度（ms/字），默认 100
			minValue?: number; // 嘴型开合最小值（0-1），默认 0.5
			maxValue?: number; // 嘴型开合最大值（0-1），默认 1
		};
	};
	responsive?: {
		hideOnMobile?: boolean; // 是否在移动端隐藏
		mobileBreakpoint?: number; // 移动端断点，默认 768
	};
};
