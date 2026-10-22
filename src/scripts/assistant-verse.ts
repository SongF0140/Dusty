import { TYPEWRITER_TIMING } from "../utils/progressive-text";

/** Replay the two lines whenever the Agent drawer becomes visible. */
class TerminalVerse extends HTMLElement {
	private dispose?: () => void;

	connectedCallback() {
		this.dispose?.();
		const drawer = this.closest<HTMLElement>("#command-navigation");
		const empty = this.closest<HTMLElement>("[data-assistant-empty]");
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
			canvas.style.width = `${canvas.width * 1.25}px`;
			canvas.style.height = "25px";
			line.prepend(canvas);
			const context = canvas.getContext("2d");
			const output = line.querySelector<HTMLElement>("[data-verse-text]")!;
			output.hidden = !!context;
			canvas.hidden = !context;
			return {
				text,
				output,
				canvas,
				context,
				cursor: line.querySelector<HTMLElement>(".verse-cursor")!,
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
			context.fillStyle = "white";
			for (let i = 0; i < count; i++) context.fillText(line.text[i], i * 13, 2);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
			for (let i = 0; i < pixels.data.length; i += 4) {
				const position = ((i / 4) % canvas.width) / canvas.width;
				pixels.data[i] = Math.round(243 - 95 * position);
				pixels.data[i + 1] = Math.round(246 - 50 * position);
				pixels.data[i + 2] = 255;
				pixels.data[i + 3] = pixels.data[i + 3] >= 96 ? 255 : 0;
			}
			context.putImageData(pixels, 0, 0);
			line.cursor.style.left = `${count * 13 * 1.25}px`;
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
		const shown = () =>
			!drawer.inert && drawer.dataset.mode === "assistant" && !empty?.hidden;
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
			if (!done && timer === undefined)
				timer = setTimeout(tick, TYPEWRITER_TIMING.initial);
		};
		const observer = new MutationObserver(sync);
		observer.observe(drawer, {
			attributes: true,
			attributeFilter: ["inert", "data-mode", "class"],
		});
		if (empty)
			observer.observe(empty, {
				attributes: true,
				attributeFilter: ["hidden"],
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
