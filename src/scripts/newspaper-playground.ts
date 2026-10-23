/** Keep paper-margin drawings in actual whitespace, outside animated page containers. */
class NewspaperPlayground extends HTMLElement {
	private dispose?: () => void;

	connectedCallback() {
		this.dispose?.();
		const template = this.querySelector("template");
		const layer = template?.content.firstElementChild?.cloneNode(true) as
			| HTMLElement
			| undefined;
		if (!layer) return;
		document.body.append(layer);
		const controller = new AbortController();
		const options = { signal: controller.signal };
		const scenes = new Map(
			Array.from(
				layer.querySelectorAll<SVGElement>("[data-paper-scene]"),
				(scene) => [scene.dataset.paperScene || "", scene],
			),
		);
		const actors = Array.from(
			layer.querySelectorAll<SVGElement>("[data-paper-actor]"),
		);
		let frame = 0;
		let lastScrollY = window.scrollY;
		const leanRopes = (delta: number) => {
			if (Math.abs(delta) < 1) return;
			layer.style.setProperty("--rope-lean", delta > 0 ? "-7.5deg" : "7.5deg");
		};
		let pointer: { x: number; y: number } | undefined;
		const rect = (selector: string) => {
			const element = document.querySelector<HTMLElement>(selector);
			const box = element?.getBoundingClientRect();
			return box && box.width > 0 && box.height > 0 ? box : undefined;
		};
		const place = (
			name: string,
			x: number,
			y: number,
			width: number,
			height: number,
			visible = true,
		) => {
			const scene = scenes.get(name);
			if (!scene) return;
			const shown =
				visible && width >= 28 && y < innerHeight && y + height > 80;
			scene.toggleAttribute("hidden", !shown);
			if (!shown) return;
			scene.style.left = `${x}px`;
			scene.style.top = `${y}px`;
			scene.style.width = `${width}px`;
			scene.style.height = `${height}px`;
			const near =
				pointer &&
				pointer.x >= x - 32 &&
				pointer.x <= x + width + 32 &&
				pointer.y >= y - 24 &&
				pointer.y <= y + height + 24;
			scene.classList.toggle("is-near", Boolean(near));
		};
		const layout = () => {
			frame = 0;
			layer.dataset.paused = String(document.hidden);
			if (innerWidth < 768 || !this.isConnected) {
				for (const scene of scenes.values()) scene.setAttribute("hidden", "");
				for (const actor of actors) actor.classList.remove("is-awake");
				return;
			}
			const heading = rect(".home-recent-posts .home-section-heading");
			const title = rect(".home-recent-posts .home-section-heading h2");
			if (heading && title) {
				const leftSpace = title.left - heading.left - 18;
				const rightSpace = heading.right - title.right - 18;
				const leftWidth = Math.min(300, leftSpace);
				const rightWidth = Math.min(300, rightSpace);
				place(
					"heading-left",
					heading.left + (leftSpace - leftWidth) / 2,
					heading.top + (heading.height - (leftWidth * 95) / 300) / 2,
					leftWidth,
					(leftWidth * 95) / 300,
					leftSpace >= 90,
				);
				place(
					"heading-right",
					title.right + 18 + (rightSpace - rightWidth) / 2,
					heading.top + (heading.height - (rightWidth * 95) / 300) / 2,
					rightWidth,
					(rightWidth * 95) / 300,
					rightSpace >= 90,
				);
			}
			const grid = rect("#main-grid");
			const drawer =
				document.documentElement.classList.contains("nav-terminal-open");
			const gutterTop = Math.max(18, (rect("#navbar")?.bottom ?? 72) + 8);
			if (grid) {
				const leftGap = grid.left;
				const rightGap = innerWidth - grid.right;
				const leftWidth = Math.min(64, leftGap - 10);
				const rightWidth = Math.min(64, rightGap - 10);
				const gutterHeight = innerHeight - gutterTop - 18;
				const leftScene = scenes.get("gutter-left");
				if (leftScene && leftWidth >= 28) {
					// Keep characters proportional while filling the full paper margin.
					const units = (gutterHeight * 72) / leftWidth;
					leftScene.setAttribute("viewBox", `0 0 72 ${units}`);
					leftScene
						.querySelector("[data-gutter-rope]")
						?.setAttribute(
							"d",
							`M40 0Q30 ${units / 4} 40 ${units / 2}T40 ${units}`,
						);
					const actors = leftScene.querySelectorAll("[data-gutter-actor]");
					actors.forEach((actor, index) => {
						actor.setAttribute(
							"transform",
							`translate(0 ${60 + (index * (units - 120)) / (actors.length - 1)})`,
						);
					});
				}
				place(
					"gutter-left",
					(leftGap - leftWidth) / 2,
					gutterTop,
					leftWidth,
					gutterHeight,
					leftGap >= 42 && !drawer,
				);
				place(
					"gutter-right",
					grid.right + (rightGap - rightWidth) / 2,
					gutterTop + 14,
					rightWidth,
					(rightWidth * 190) / 90,
					rightGap >= 42 && !drawer,
				);
			}
			const right = rect("#right-sidebar");
			const music = rect(
				'#right-sidebar widget-layout:has([id^="music-widget-"])',
			);
			const last = music || rect("#right-sidebar-sticky");
			if (right && last)
				place(
					"sidebar-bottom",
					right.left + 5,
					last.bottom + 12,
					right.width - 10,
					((right.width - 10) * 180) / 290,
					!drawer,
				);
			else scenes.get("sidebar-bottom")?.setAttribute("hidden", "");
			const navigation = rect("#command-navigation-toggle");
			for (const actor of actors) {
				const box = actor.getBoundingClientRect();
				const padding = actor.classList.contains("is-awake") ? 42 : 30;
				const visible =
					!actor.closest("[hidden]") &&
					box.width > 0 &&
					box.bottom > gutterTop &&
					box.top < innerHeight;
				const close =
					pointer &&
					pointer.x >= box.left - padding &&
					pointer.x <= box.right + padding &&
					pointer.y >= box.top - padding &&
					pointer.y <= box.bottom + padding;
				const nearNavigation =
					actor.dataset.paperRole === "guide" &&
					pointer &&
					navigation &&
					Math.hypot(
						pointer.x - (navigation.left + navigation.width / 2),
						pointer.y - (navigation.top + navigation.height / 2),
					) < 58;
				actor.classList.toggle(
					"is-awake",
					Boolean(visible && !drawer && (close || nearNavigation)),
				);
			}
		};
		const schedule = () => {
			if (this.isConnected && !frame) frame = requestAnimationFrame(layout);
		};
		window.addEventListener("resize", schedule, options);
		window.addEventListener("scroll", () => {
			leanRopes(window.scrollY - lastScrollY);
			lastScrollY = window.scrollY;
			schedule();
		}, { ...options, passive: true });
		window.addEventListener("wheel", (event) => {
			// Follow the page, not scrolling inside the assistant or another panel.
			if (event.target instanceof Element && event.target.closest("blog-assistant, textarea, [role='dialog']")) return;
			leanRopes(event.deltaY);
		}, { ...options, passive: true });
		document.addEventListener("visibilitychange", schedule, options);
		document.addEventListener(
			"pointermove",
			(event) => {
				pointer = { x: event.clientX, y: event.clientY };
				schedule();
			},
			{ ...options, passive: true },
		);
		document.addEventListener(
			"pointerleave",
			() => {
				pointer = undefined;
				schedule();
			},
			options,
		);
		const resize = new ResizeObserver(schedule);
		for (const selector of [
			"#main-grid",
			".home-section-heading",
			"#right-sidebar",
		]) {
			const element = document.querySelector(selector);
			if (element) resize.observe(element);
		}
		const theme = new MutationObserver(schedule);
		theme.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		void document.fonts.ready.then(schedule);
		schedule();
		this.dispose = () => {
			controller.abort();
			cancelAnimationFrame(frame);
			resize.disconnect();
			theme.disconnect();
			layer.remove();
		};
	}

	disconnectedCallback() {
		this.dispose?.();
	}
}

if (!customElements.get("newspaper-playground"))
	customElements.define("newspaper-playground", NewspaperPlayground);
