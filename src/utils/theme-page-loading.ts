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
	// Keep the sun/moon control visible while covering all reading columns and the drawer.
	const align = () => {
		const bottom = document.getElementById("navbar")?.getBoundingClientRect().bottom ?? 0;
		cover.style.top = `${Math.max(0, Math.min(innerHeight, bottom))}px`;
	};
	align();
	window.addEventListener("resize", align);
	window.addEventListener("scroll", align, { passive: true });
	document.body.append(cover);
	document.documentElement.classList.add("theme-page-pending");
	return () => {
		window.removeEventListener("resize", align);
		window.removeEventListener("scroll", align);
		cover.remove();
		if (!document.querySelector(".theme-page-cover"))
			document.documentElement.classList.remove("theme-page-pending");
	};
}

export async function waitForThemePage({
	timeoutMs = 4000,
	signal,
}: { timeoutMs?: number; signal?: AbortSignal } = {}) {
	if (signal?.aborted) return;
	const visible = (element: Element) => {
		// Astro islands use display: contents, so their own rectangle can be empty.
		const boxes = getComputedStyle(element).display === "contents"
			? [...element.children].flatMap(child => [...child.getClientRects()])
			: [...element.getClientRects()];
		return boxes.some(rect => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth);
	};
	const cleanup: (() => void)[] = [];
	let stopped = false;
	let frame = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<void>(resolve => {
		timer = setTimeout(resolve, timeoutMs);
		const abort = () => resolve();
		signal?.addEventListener("abort", abort, { once: true });
		cleanup.push(() => signal?.removeEventListener("abort", abort));
	});
	const components = [...document.querySelectorAll("astro-island[ssr]")].filter(visible);
	const ready = Promise.all(components.map(component => new Promise<void>(resolve => {
			if (!component.hasAttribute("ssr")) { resolve(); return; }
			const hydrate = () => resolve();
			component.addEventListener("astro:hydrate", hydrate, { once: true });
			cleanup.push(() => component.removeEventListener("astro:hydrate", hydrate));
		}))).then(async () => {
		if (stopped) return;
		// Hydration can insert images; scan only after those components have rendered.
		await Promise.allSettled([
			document.fonts.ready,
			...[...document.images].filter(visible).map(image => Promise.resolve().then(() => image.decode())),
		]);
		if (stopped) return;
		// Give updates two frames to paint, within the same bounded readiness budget.
		await new Promise<void>(resolve => {
			frame = requestAnimationFrame(() => {
				frame = requestAnimationFrame(() => resolve());
			});
		});
	});
	try {
		await Promise.race([ready, deadline]);
	} finally {
		stopped = true;
		clearTimeout(timer);
		cancelAnimationFrame(frame);
		cleanup.forEach(dispose => dispose());
	}
}
