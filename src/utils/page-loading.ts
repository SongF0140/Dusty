const loadingReasons = new Set<string>();

export function showPageSkeleton(targetUrl: string, reason = "navigation") {
	const shell = document.getElementById("page-content-shell");
	const skeleton = shell?.querySelector<HTMLElement>("[data-navigation-skeleton]");
	const content = document.getElementById("swup-container");
	if (!shell || !skeleton || !content) return;
	loadingReasons.add(reason);
	if (reason === "theme" && !loadingReasons.has("navigation")) {
		// Position the overlay itself at the visible content edge, without giant padding.
		const top = shell.getBoundingClientRect().top;
		const navbarBottom = document.getElementById("navbar")?.getBoundingClientRect().bottom ?? 0;
		skeleton.style.setProperty("--skeleton-offset", `${Math.max(0, navbarBottom + 8 - top)}px`);
	} else if (reason === "navigation") {
		skeleton.style.removeProperty("--skeleton-offset");
	}
	const path = new URL(targetUrl, location.href).pathname.replace(/\/$/, "");
	skeleton.dataset.layout = !path ? "grid" : path.endsWith("/archive") ? "list" : "article";
	skeleton.hidden = false;
	shell.classList.add("is-content-loading");
	content.setAttribute("aria-busy", "true");
	content.inert = true;
}

export function hidePageSkeleton(reason = "navigation") {
	loadingReasons.delete(reason);
	const shell = document.getElementById("page-content-shell");
	const skeleton = shell?.querySelector<HTMLElement>("[data-navigation-skeleton]");
	const content = document.getElementById("swup-container");
	if (loadingReasons.size > 0) {
		if (content) {
			content.setAttribute("aria-busy", "true");
			content.inert = true;
		}
		return;
	}
	if (skeleton) {
		skeleton.hidden = true;
		skeleton.style.removeProperty("--skeleton-offset");
	}
	shell?.classList.remove("is-content-loading");
	if (content) {
		content.removeAttribute("aria-busy");
		content.inert = false;
	}
}
