import { TYPEWRITER_TIMING } from "../utils/progressive-text";

/** Replay the two lines whenever the Agent drawer becomes visible. */
class TerminalVerse extends HTMLElement {
	private dispose?: () => void;

	connectedCallback() {
		this.dispose?.();
		const drawer = this.closest<HTMLElement>("#command-navigation");
		const lines = Array.from(
			this.querySelectorAll<HTMLElement>("[data-verse-line]"),
		).map((line) => {
			line.querySelector("canvas")?.remove();
			const text = Array.from(line.dataset.verseLine || "");
			const canvas = document.createElement("canvas");
			canvas.className = "verse-pixel-canvas";
			canvas.setAttribute("aria-hidden", "true");
			canvas.width = text.length * 13;
			canvas.height = 20;
			line.style.maxWidth = `${canvas.width * 1.15}px`;
			canvas.style.width = "100%";
			canvas.style.height = "auto";
			line.prepend(canvas);
			const context = canvas.getContext("2d");
			const output = line.querySelector<HTMLElement>("[data-verse-text]");
			const cursor = line.querySelector<HTMLElement>(".verse-cursor");
			if (!output || !cursor) throw new Error("像素诗句缺少显示元素");
			output.hidden = !!context;
			canvas.hidden = !context;
			return {
				text,
				output,
				canvas,
				context,
				cursor,
			};
		});
		if (!drawer || !lines.length) return;
		// A small, hard-edged glyph grid gives the poem a gentle bitmap texture.
		const renderLine = (line: (typeof lines)[number], count: number) => {
			line.output.textContent = line.text.slice(0, count).join("");
			const { context, canvas } = line;
			if (!context) return;
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.font = '12px "SimSun", "Songti SC", monospace';
			context.textBaseline = "top";
			const style = getComputedStyle(this);
			const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
			gradient.addColorStop(
				0,
				style.getPropertyValue("--sea-text-start").trim() || style.color,
			);
			gradient.addColorStop(
				0.48,
				style.getPropertyValue("--sea-text-mid").trim() || style.color,
			);
			gradient.addColorStop(
				1,
				style.getPropertyValue("--sea-text-end").trim() || style.color,
			);
			context.fillStyle = gradient;
			for (let i = 0; i < count; i++) context.fillText(line.text[i], i * 13, 2);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
			for (let i = 0; i < pixels.data.length; i += 4) {
				pixels.data[i + 3] = pixels.data[i + 3] >= 96 ? 255 : 0;
			}
			context.putImageData(pixels, 0, 0);
			line.cursor.style.left = `${(count / line.text.length) * 100}%`;
		};
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		let lineIndex = 0;
		let charIndex = 0;
		let done = false;
		let wasShown = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		for (const line of lines) {
			renderLine(line, 0);
			line.cursor.hidden = true;
		}
		const shown = () => !drawer.inert && drawer.dataset.mode === "assistant";
		const visible = () => shown() && !document.hidden;
		const finish = () => {
			clearTimeout(timer);
			timer = undefined;
			for (const line of lines) {
				renderLine(line, line.text.length);
				line.cursor.hidden = true;
			}
			lines[lines.length - 1].cursor.hidden = false;
			done = true;
			this.dataset.complete = "true";
		};
		const tick = () => {
			timer = undefined;
			if (!visible() || done) return;
			const line = lines[lineIndex];
			line.cursor.hidden = false;
			renderLine(line, ++charIndex);
			if (charIndex >= line.text.length) {
				if (lineIndex === lines.length - 1) {
					finish();
					return;
				}
				line.cursor.hidden = true;
				lineIndex++;
				charIndex = 0;
				timer = setTimeout(tick, TYPEWRITER_TIMING.line);
			} else timer = setTimeout(tick, TYPEWRITER_TIMING.character);
		};
		const sync = () => {
			if (!shown()) {
				clearTimeout(timer);
				timer = undefined;
				wasShown = false;
				return;
			}
			if (!wasShown) {
				clearTimeout(timer);
				timer = undefined;
				lineIndex = charIndex = 0;
				done = false;
				wasShown = true;
				this.dataset.complete = "false";
				for (const line of lines) {
					renderLine(line, 0);
					line.cursor.hidden = true;
				}
			}
			if (reduced.matches) {
				finish();
				return;
			}
			if (!visible()) {
				clearTimeout(timer);
				timer = undefined;
				return;
			}
			if (done) for (const line of lines) renderLine(line, line.text.length);
			if (!done && timer === undefined)
				timer = setTimeout(tick, TYPEWRITER_TIMING.initial);
		};
		const observer = new MutationObserver(sync);
		observer.observe(drawer, {
			attributes: true,
			attributeFilter: ["inert", "data-mode", "class"],
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		document.addEventListener("visibilitychange", sync);
		reduced.addEventListener("change", sync);
		sync();
		this.dispose = () => {
			clearTimeout(timer);
			observer.disconnect();
			document.removeEventListener("visibilitychange", sync);
			reduced.removeEventListener("change", sync);
		};
	}

	disconnectedCallback() {
		this.dispose?.();
	}
}

if (!customElements.get("terminal-verse"))
	customElements.define("terminal-verse", TerminalVerse);
