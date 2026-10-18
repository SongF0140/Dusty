/** One cover for the entire page, retained until visible components are ready. */
export function coverThemePage() {
	const source = document.querySelector<HTMLElement>("[data-navigation-skeleton]");
	if (!source) return () => {};
	const cover = document.createElement("div");
	cover.className = "theme-page-cover";
	cover.setAttribute("role", "status");
	cover.setAttribute("aria-label", "正在切换主题");
	const colors = getComputedStyle(document.documentElement);
	for (const name of ["--retro-paper", "--retro-surface", "--retro-muted", "--retro-ink"]) {
		cover.style.setProperty(name, colors.getPropertyValue(name));
	}
	const skeleton = source.cloneNode(true) as HTMLElement;
	skeleton.removeAttribute("data-navigation-skeleton");
	skeleton.removeAttribute("style");
	skeleton.hidden = false;
	skeleton.setAttribute("aria-hidden", "true");
	cover.append(skeleton);
	document.body.append(cover);
	document.documentElement.classList.add("theme-page-pending");
	return () => {
		cover.remove();
		document.documentElement.classList.remove("theme-page-pending");
	};
}

export async function waitForThemePage() {
	const visible = (element: Element) => {
		// Astro islands use display: contents, so their own rectangle can be empty.
		const boxes = getComputedStyle(element).display === "contents"
			? [...element.children].flatMap(child => [...child.getClientRects()])
			: [...element.getClientRects()];
		return boxes.some(rect => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth);
	};
	const components = [...document.querySelectorAll("astro-island[ssr]")].filter(visible);
	await Promise.all(components.map(component => new Promise<void>(resolve => {
		if (!component.hasAttribute("ssr")) { resolve(); return; }
		component.addEventListener("astro:hydrate", () => resolve(), { once: true });
	})));
	await Promise.allSettled([
		document.fonts.ready,
		...[...document.images].filter(visible).map(image => image.decode()),
	]);
	// Commit component updates and paint the final palette while still covered.
	await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
