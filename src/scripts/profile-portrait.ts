class ProfilePortrait extends HTMLElement {
	private events?: AbortController;
	private ribbons = new Map<HTMLElement, Animation>();
	private ribbonLayer?: HTMLDivElement;

	connectedCallback() {
		this.events?.abort();
		this.events = new AbortController();
		const options = { signal: this.events.signal };
		const front = this.querySelector<HTMLButtonElement>("[data-portrait-flip]");
		const back = this.querySelector<HTMLElement>("[data-portrait-back]");
		const returnSurface = this.querySelector<HTMLButtonElement>(
			"[data-portrait-return]",
		);
		const pull = this.querySelector<HTMLButtonElement>("[data-curtain-pull]");
		const cord = this.querySelector<HTMLElement>(".royal-cord");
		const aperture = this.querySelector<HTMLElement>(".royal-window");
		const curtains = [...this.querySelectorAll<HTMLElement>(".royal-curtain")];
		if (
			!front ||
			!back ||
			!returnSurface ||
			!pull ||
			!cord ||
			!aperture ||
			!curtains.length
		)
			return;
		let curtainRevision = 0;
		let pointer: {
			id: number;
			y: number;
			delta: number;
			opened: boolean;
		} | null = null;
		let suppressClickUntil = 0;
		this.dataset.dragging = "false";
		cord.style.removeProperty("--pull-drag");

		const consumeDragClick = (event: MouseEvent) => {
			if (performance.now() >= suppressClickUntil) return false;
			suppressClickUntil = 0;
			event.preventDefault();
			return true;
		};
		const flip = (flipped: boolean) => {
			if (!flipped && this.dataset.curtain !== "closed") {
				pull.focus({ preventScroll: true });
				return;
			}
			if (!flipped) this.clearRibbons();
			this.dataset.flipped = String(flipped);
			front.setAttribute("aria-expanded", String(flipped));
			front.inert = flipped;
			front.setAttribute("aria-hidden", String(flipped));
			back.inert = !flipped;
			back.setAttribute("aria-hidden", String(!flipped));
			(flipped ? pull : front).focus({ preventScroll: true });
		};
		const updateSurface = () => {
			const closed = this.dataset.curtain === "closed";
			const open = this.dataset.curtain === "open";
			returnSurface.setAttribute(
				"aria-label",
				closed ? "翻回头像" : open ? "点击海问香与她互动" : "幕布正在移动",
			);
			returnSurface.setAttribute("aria-disabled", String(!closed && !open));
			returnSurface.title = closed
				? "点击相框翻回头像"
				: open
					? "点击海问香打招呼；先拉绳关闭幕布，再翻回头像"
					: "请等幕布停稳";
		};
		this.dataset.curtain = this.dataset.open === "true" ? "open" : "closed";
		updateSurface();
		const setOpen = (opened: boolean) => {
			const revision = ++curtainRevision;
			this.dataset.curtain = opened ? "opening" : "closing";
			this.dataset.open = String(opened);
			updateSurface();
			pull.setAttribute("aria-expanded", String(opened));
			pull.setAttribute("aria-label", opened ? "拉绳合上旗帘" : "拉绳打开旗帘");
			pull.title = opened
				? "向上拉绳收起幕布，也可点击"
				: "向下拉绳展开幕布，也可点击";
			this.clearRibbons();
			if (opened && !matchMedia("(prefers-reduced-motion: reduce)").matches)
				this.burstRibbons(aperture.getBoundingClientRect());
			// Read computed styles to start the actual CSS transitions before awaiting them.
			for (const curtain of curtains) getComputedStyle(curtain).transform;
			const motions = curtains.flatMap((curtain) => curtain.getAnimations());
			Promise.all(
				motions.map((motion) => motion.finished.catch(() => {})),
			).then(() => {
				if (options.signal.aborted || revision !== curtainRevision) return;
				this.dataset.curtain = opened ? "open" : "closed";
				updateSurface();
			});
		};
		const finishPull = (cancelled = false) => {
			if (!pointer) return;
			const completed = pointer;
			pointer = null;
			this.dataset.dragging = "false";
			cord.style.removeProperty("--pull-drag");
			if (Math.abs(completed.delta) > 3)
				suppressClickUntil = performance.now() + 350;
			if (
				!cancelled &&
				(completed.opened ? completed.delta <= -12 : completed.delta >= 12)
			) {
				setOpen(!completed.opened);
			}
			if (pull.hasPointerCapture(completed.id))
				pull.releasePointerCapture(completed.id);
		};

		front.addEventListener(
			"click",
			(event) => {
				if (!consumeDragClick(event)) flip(true);
			},
			options,
		);
		returnSurface.addEventListener(
			"click",
			(event) => {
				if (consumeDragClick(event)) return;
				if (this.dataset.curtain === "closed") flip(false);
				else if (this.dataset.curtain === "open") {
					const character =
						this.querySelector<HTMLElement>(
							".garden-character",
						)?.getBoundingClientRect();
					if (
						event.detail === 0 ||
						(character &&
							event.clientX >= character.left &&
							event.clientX <= character.right &&
							event.clientY >= character.top &&
							event.clientY <= character.bottom)
					) {
						this.dispatchEvent(new CustomEvent("portrait:interact"));
					}
				}
			},
			options,
		);
		this.addEventListener("click", (event) => event.stopPropagation(), options);
		pull.addEventListener(
			"click",
			(event) => {
				if (!consumeDragClick(event)) setOpen(this.dataset.open !== "true");
			},
			options,
		);
		pull.addEventListener(
			"pointerdown",
			(event) => {
				if (!event.isPrimary || event.button !== 0 || pointer) return;
				event.preventDefault();
				suppressClickUntil = 0;
				pointer = {
					id: event.pointerId,
					y: event.clientY,
					delta: 0,
					opened: this.dataset.open === "true",
				};
				this.dataset.dragging = "true";
				pull.setPointerCapture(event.pointerId);
				pull.focus({ preventScroll: true });
			},
			options,
		);
		pull.addEventListener(
			"pointermove",
			(event) => {
				if (!pointer || pointer.id !== event.pointerId) return;
				pointer.delta = event.clientY - pointer.y;
				cord.style.setProperty(
					"--pull-drag",
					`${Math.max(-35, Math.min(60, pointer.delta))}px`,
				);
			},
			options,
		);
		pull.addEventListener(
			"pointerup",
			(event) => {
				if (pointer?.id === event.pointerId) finishPull();
			},
			options,
		);
		pull.addEventListener(
			"pointercancel",
			(event) => {
				if (pointer?.id === event.pointerId) finishPull(true);
			},
			options,
		);
		pull.addEventListener(
			"lostpointercapture",
			(event) => {
				if (pointer?.id === event.pointerId) finishPull(true);
			},
			options,
		);
		this.addEventListener(
			"keydown",
			(event) => {
				if (event.key === "Escape" && this.dataset.flipped === "true") {
					event.stopPropagation();
					finishPull(true);
					flip(false);
				}
			},
			options,
		);
	}

	private burstRibbons(origin: DOMRect) {
		// A viewport layer lets the burst escape the card's clipped 3D faces.
		const layer = document.createElement("div");
		layer.className = "royal-ribbon-burst";
		layer.setAttribute("aria-hidden", "true");
		document.body.append(layer);
		this.ribbonLayer = layer;
		const gold = ["#d8af61", "#f0ca7d", "#ffe4a4"];
		const silver = ["#c8d1dd", "#e9edf5", "#fffaf0"];
		const shapes = {
			star: "M12 2.4 14.8 8.2 21.2 9.1 16.6 13.6 17.7 20 12 17 6.3 20 7.4 13.6 2.8 9.1 9.2 8.2Z",
			moon: "M21 12.79A9 9 0 0 1 11.21 3 9 9 0 1 0 21 12.79Z",
		};
		const svgNS = "http://www.w3.org/2000/svg";
		const spread = Math.min(230, Math.max(140, innerWidth * 0.28));
		for (let i = 0; i < 64; i++) {
			const ribbon = document.createElement("i");
			ribbon.className = "royal-ribbon";
			const kind = i % 2 === 0 ? "star" : "moon";
			const isSilver = i % 4 >= 2;
			const palette = isSilver ? silver : gold;
			ribbon.dataset.shape = kind;
			ribbon.dataset.metal = isSilver ? "silver" : "gold";
			ribbon.style.color = palette[Math.floor(i / 4) % palette.length];
			const glyph = document.createElementNS(svgNS, "svg");
			glyph.setAttribute("viewBox", "0 0 24 24");
			glyph.setAttribute("aria-hidden", "true");
			const shape = document.createElementNS(svgNS, "path");
			shape.setAttribute("d", shapes[kind]);
			shape.setAttribute("fill", "currentColor");
			shape.setAttribute("stroke", isSilver ? "#77859a" : "#a0793c");
			shape.setAttribute("stroke-width", "0.45");
			shape.setAttribute("stroke-linejoin", "round");
			glyph.append(shape);
			ribbon.append(glyph);
			ribbon.style.left = `${origin.x + origin.width / 2}px`;
			ribbon.style.top = `${origin.y + origin.height / 2}px`;
			const size = 11 + Math.random() * 6;
			ribbon.style.width = `${size}px`;
			ribbon.style.height = `${size}px`;
			layer.append(ribbon);
			const angle = ((i + Math.random()) / 64) * Math.PI * 2;
			const distance = spread * (0.45 + Math.random() * 0.55);
			const x = Math.cos(angle) * distance;
			const y = Math.sin(angle) * distance;
			const gravity = 100 + Math.random() * 100;
			const turn = (Math.random() - 0.5) * 1080;
			const flutter = Math.random() * Math.PI * 2;
			const frames: Keyframe[] = [];
			for (let step = 0; step <= 16; step++) {
				const progress = step / 16;
				const outward = 1 - (1 - progress) ** 2;
				frames.push({
					offset: progress,
					transform: `translate(-50%, -50%) translate(${x * outward}px, ${y * outward + gravity * progress ** 2}px) rotate(${turn * progress}deg) rotateY(${Math.sin(flutter + progress * Math.PI * 4) * 65}deg)`,
					opacity:
						progress === 0 ? 0 : progress < 0.65 ? 1 : (1 - progress) / 0.35,
				});
			}
			const animation = ribbon.animate(frames, {
				duration: 1450 + Math.random() * 600,
				delay: 180 + Math.random() * 180,
				easing: "linear",
				fill: "both",
			});
			this.ribbons.set(ribbon, animation);
			animation.finished
				.catch(() => {})
				.finally(() => {
					ribbon.remove();
					this.ribbons.delete(ribbon);
					if (this.ribbonLayer === layer && !layer.childElementCount) {
						layer.remove();
						this.ribbonLayer = undefined;
					}
				});
		}
	}

	private clearRibbons() {
		for (const [element, animation] of this.ribbons) {
			animation.cancel();
			element.remove();
		}
		this.ribbons.clear();
		this.ribbonLayer?.remove();
		this.ribbonLayer = undefined;
	}

	disconnectedCallback() {
		this.events?.abort();
		this.clearRibbons();
	}
}

if (!customElements.get("profile-portrait"))
	customElements.define("profile-portrait", ProfilePortrait);
