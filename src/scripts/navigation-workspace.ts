import {
	type NavigationMode,
	readNavigationMode,
	saveNavigationMode,
} from "@/utils/navigation-assistant-state";

export function createNavigationWorkspace(drawer: HTMLElement) {
	const storage = () => {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	};
	const tabs = Array.from(
		drawer.querySelectorAll<HTMLButtonElement>("[data-navigation-mode]"),
	);
	const title = drawer.querySelector<HTMLElement>("[data-navigation-title]");
	let mode: NavigationMode = readNavigationMode(storage());
	const focusInput = () => {
		const selector =
			mode === "assistant" ? "#haiwenxiang-draft" : "#terminal-command-input";
		drawer.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
	};
	const select = (next: NavigationMode, persist = true) => {
		// Flush the draft via blur before its panel becomes hidden.
		if (drawer.contains(document.activeElement))
			(document.activeElement as HTMLElement)?.blur();
		mode = next;
		drawer.dataset.mode = mode;
		if (title)
			title.textContent =
				mode === "assistant" ? "海问香 / 阅读助手" : "DUSTY / SHELL";
		drawer.setAttribute(
			"aria-label",
			mode === "assistant" ? "海问香助手与命令行导航" : "Command navigation",
		);
		for (const tab of tabs) {
			const selected = tab.dataset.navigationMode === mode;
			tab.setAttribute("aria-selected", String(selected));
			tab.tabIndex = selected ? 0 : -1;
			const panelId = tab.getAttribute("aria-controls");
			const panel = panelId ? document.getElementById(panelId) : null;
			if (panel) panel.hidden = !selected;
		}
		if (persist) saveNavigationMode(storage(), mode);
	};
	for (const tab of tabs) {
		tab.addEventListener("click", () => {
			select(tab.dataset.navigationMode as NavigationMode);
			tab.focus({ preventScroll: true });
		});
		tab.addEventListener("keydown", (event) => {
			if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
				return;
			event.preventDefault();
			const index =
				event.key === "Home"
					? 0
					: event.key === "End"
						? tabs.length - 1
						: (tabs.indexOf(tab) +
								(event.key === "ArrowRight" ? 1 : -1) +
								tabs.length) %
							tabs.length;
			const next = tabs[index];
			select(next.dataset.navigationMode as NavigationMode);
			next.focus();
		});
	}
	select(mode, false);
	return { focusInput };
}
