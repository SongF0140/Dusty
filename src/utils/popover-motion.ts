// Measure layout coordinates, not the collapsed panel's transformed rectangle.
function setOrigin(panel: HTMLElement, trigger: HTMLElement) {
	const parent = panel.offsetParent as HTMLElement | null;
	const parentRect = parent?.getBoundingClientRect();
	const left = (parentRect?.left ?? 0) + (parent?.clientLeft ?? 0) + panel.offsetLeft - (parent?.scrollLeft ?? 0);
	const top = (parentRect?.top ?? 0) + (parent?.clientTop ?? 0) + panel.offsetTop - (parent?.scrollTop ?? 0);
	const button = trigger.getBoundingClientRect();
	panel.style.setProperty("--popover-origin", `${button.left + button.width / 2 - left}px ${button.top + button.height / 2 - top}px`);
}

export function initPopoverMotion() {
	const panels: Record<string, string> = {
		"nav-menu-switch": "nav-menu-panel",
		"music-player-switch": "music-nav-panel",
		"search-switch": "search-panel",
		"search-bar": "search-panel",
		"wallpaper-mode-switch": "wallpaper-mode-panel",
		"floating-toc-btn": "floating-toc-panel",
		"command-navigation-toggle": "command-navigation",
	};
	const prepare = (event: Event) => {
		const target = event.target instanceof Element ? event.target : null;
		const dropdownTrigger = target?.closest<HTMLElement>("[data-dropdown-trigger]");
		if (dropdownTrigger) {
			const menu = dropdownTrigger.closest("[data-dropdown]")?.querySelector<HTMLElement>("[data-dropdown-menu]");
			if (menu) setOrigin(menu, dropdownTrigger);
			return;
		}
		const trigger = target?.closest<HTMLElement>(Object.keys(panels).map((id) => `#${id}`).join(","));
		const panel = trigger && document.getElementById(panels[trigger.id]);
		if (trigger && panel) setOrigin(panel, trigger);
	};
	document.addEventListener("pointerover", prepare, { capture: true, passive: true });
	document.addEventListener("click", prepare, true);
	document.addEventListener("focusin", prepare, true);
	document.addEventListener("keydown", prepare, true);
}
