/** Flowing edge ribbons; suspended while the drawer or document is hidden. */
class AnimatedWaterFrame extends HTMLElement {
	private dispose?: () => void;

	connectedCallback() {
		this.dispose?.();
		const canvas = this.querySelector("canvas");
		const drawer = this.closest<HTMLElement>("#command-navigation");
		const context = canvas?.getContext("2d");
		if (!canvas || !context || !drawer) return;
		const reduced = matchMedia("(prefers-reduced-motion: reduce)");
		let width = 0;
		let height = 0;
		let scale = 1;
		let phase = 0;
		let last = 0;
		let frame = 0;
		let color = "#236f94";
		const visible = () =>
			!drawer.inert && drawer.dataset.mode === "assistant" && !document.hidden;
		const edge = (length: number, offset: number) => {
			for (let layer = 0; layer < 3; layer++) {
				context.beginPath();
				for (let x = 0; x <= length + 3; x += 3) {
					const angle = x / (19 + layer * 5) - phase + offset + layer * 1.8;
					const amplitude = reduced.matches ? 1 : 2.8;
					const y =
						4 +
						layer * 3 +
						amplitude *
							(Math.sin(angle) + Math.sin(angle * 0.57 + phase * 0.4) * 0.3);
					if (x === 0) context.moveTo(x, y);
					else context.lineTo(x, y);
				}
				context.globalAlpha = 0.5 - layer * 0.12;
				context.stroke();
				context.lineTo(length + 3, 0);
				context.lineTo(0, 0);
				context.closePath();
				context.globalAlpha = 0.035;
				context.fill();
			}
		};
		const paint = () => {
			context.setTransform(scale, 0, 0, scale, 0, 0);
			context.clearRect(0, 0, width, height);
			context.strokeStyle = context.fillStyle = color;
			context.lineWidth = 1;
			edge(width, 0);
			context.save();
			context.translate(0, height);
			context.scale(1, -1);
			edge(width, 2);
			context.restore();
			context.save();
			context.translate(0, height);
			context.rotate(-Math.PI / 2);
			edge(height, 1);
			context.restore();
			context.save();
			context.translate(width, 0);
			context.rotate(Math.PI / 2);
			edge(height, 3);
			context.restore();
		};
		const tick = (now: number) => {
			frame = 0;
			if (!visible()) {
				last = 0;
				return;
			}
			if (!last || now - last >= (reduced.matches ? 80 : 32)) {
				phase += last
					? Math.min((now - last) / 1000, 0.15) * (reduced.matches ? 0.5 : 1.8)
					: 0;
				last = now;
				paint();
			}
			frame = requestAnimationFrame(tick);
		};
		const sync = () => {
			color =
				getComputedStyle(drawer).getPropertyValue("--sea-accent").trim() ||
				"#236f94";
			if (visible() && !frame) frame = requestAnimationFrame(tick);
			else if (!visible()) {
				cancelAnimationFrame(frame);
				frame = last = 0;
			}
		};
		const resize = new ResizeObserver(() => {
			width = this.clientWidth;
			height = this.clientHeight;
			scale = Math.min(devicePixelRatio || 1, 2);
			canvas.width = Math.round(width * scale);
			canvas.height = Math.round(height * scale);
			paint();
			sync();
		});
		resize.observe(this);
		const observer = new MutationObserver(sync);
		observer.observe(drawer, {
			attributes: true,
			attributeFilter: ["inert", "data-mode"],
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		document.addEventListener("visibilitychange", sync);
		reduced.addEventListener("change", sync);
		sync();
		this.dispose = () => {
			cancelAnimationFrame(frame);
			resize.disconnect();
			observer.disconnect();
			document.removeEventListener("visibilitychange", sync);
			reduced.removeEventListener("change", sync);
		};
	}

	disconnectedCallback() {
		this.dispose?.();
	}
}

if (!customElements.get("animated-water-frame")) {
	customElements.define("animated-water-frame", AnimatedWaterFrame);
}
