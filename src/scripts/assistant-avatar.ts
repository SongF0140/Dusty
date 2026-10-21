/** Small pixel face edits are drawn over the untouched portrait for each frame. */
class AnimatedAgentAvatar extends HTMLElement {
	private dispose?: () => void;
	connectedCallback() {
		this.dispose?.();
		const image = this.querySelector<HTMLImageElement>("img");
		const canvas = this.querySelector<HTMLCanvasElement>("canvas");
		const poutImage = this.querySelector<HTMLImageElement>("[data-puff-source]");
		const drawer = this.closest<HTMLElement>("#command-navigation");
		const assistant = this.closest<HTMLElement>("haiwenxiang-assistant");
		const context = canvas?.getContext("2d");
		if (!image || !canvas || !context || !drawer || !assistant) return;
		const reduced = matchMedia("(prefers-reduced-motion: reduce)");
		let base: ImageData | undefined;
		let blinking = false, mouthOpen = false;
		let puffed = false;
		let puffTimer: ReturnType<typeof setTimeout> | undefined;
		const touch = this.querySelector<HTMLButtonElement>(".assistant-avatar-touch");
		const burst = this.querySelector<SVGElement>(".assistant-puff-burst");
		let blinkTimer: ReturnType<typeof setTimeout> | undefined;
		let eyelidTimer: ReturnType<typeof setTimeout> | undefined;
		let mouthTimer: ReturnType<typeof setTimeout> | undefined;
		const shown = () => !drawer.inert && drawer.dataset.mode === "assistant" && !document.hidden;
		const visible = () => shown() && !reduced.matches;
		const paint = () => {
			if (!base) return;
			context.putImageData(base, 0, 0);
			if (puffed && poutImage?.complete && poutImage.naturalWidth) {
				context.clearRect(0, 0, 80, 80);
				context.drawImage(poutImage, 0, 0, 80, 80);
				canvas.dataset.eyes = "pout";
				canvas.dataset.mouth = "puffed";
				return;
			}
			// Coordinates refer to the 80px portrait, keeping the surrounding hair intact.
			const skin = base.data.slice((44 * 80 + 39) * 4, (44 * 80 + 39) * 4 + 3);
			context.fillStyle = `rgb(${skin.join(",")})`;
			if (blinking) {
				for (const x of [23, 45]) {
					context.beginPath();
					context.ellipse(x + 6, 46, 7, 7, 0, 0, Math.PI * 2);
					context.fill();
				}
				context.fillStyle = "#352440";
				for (const x of [24, 46]) {
					context.fillRect(x, 46, 2, 1);
					context.fillRect(x + 2, 47, 7, 1);
					context.fillRect(x + 9, 46, 2, 1);
				}
			}
			if (mouthOpen && !puffed) {
				context.fillStyle = `rgb(${skin.join(",")})`;
				context.fillRect(35, 54, 10, 6);
				context.fillStyle = "#713446";
				context.fillRect(38, 55, 4, 4);
				context.fillRect(37, 56, 6, 2);
				context.fillStyle = "#dc8f9f";
				context.fillRect(39, 58, 2, 1);
			}
			canvas.dataset.eyes = blinking ? "closed" : "open";
			canvas.dataset.mouth = puffed ? "puffed" : mouthOpen ? "open" : "rest";
		};
		const clearPuff = () => {
			clearTimeout(puffTimer); puffTimer = undefined;
			puffed = false; this.dataset.puffed = "false";
			burst?.getAnimations().forEach(animation => animation.cancel());
			if (burst) burst.style.opacity = "";
		};
		const puff = (event: Event) => {
			event.stopPropagation();
			if (!base) return;
			clearPuff(); puffed = true; this.dataset.puffed = "true"; paint();
			if (reduced.matches) { if (burst) burst.style.opacity = "1"; }
			else burst?.animate([
				{ opacity: 0, transform: "translate(-5px, 5px) scale(.55) rotate(-10deg)" },
				{ opacity: 1, transform: "translate(0, 0) scale(1.08) rotate(3deg)", offset: .15 },
				{ opacity: 1, transform: "translate(0, 0) scale(1) rotate(0deg)", offset: .8 },
				{ opacity: 0, transform: "translate(2px, -3px) scale(1.02)" },
			], { duration: 1150, easing: "ease-out" });
			puffTimer = setTimeout(() => { clearPuff(); paint(); }, 1200);
		};
		const nextBlink = () => {
			blinkTimer = setTimeout(() => {
				blinkTimer = undefined;
				if (!visible()) return;
				blinking = true; paint();
				eyelidTimer = setTimeout(() => { eyelidTimer = undefined; blinking = false; paint(); nextBlink(); }, 150);
			}, 2800 + Math.random() * 3200);
		};
		const speak = () => {
			mouthTimer = undefined;
			if (!visible() || assistant.dataset.speaking !== "true") { mouthOpen = false; paint(); return; }
			mouthOpen = !mouthOpen; paint();
			mouthTimer = setTimeout(speak, 130 + Math.random() * 90);
		};
		const sync = () => {
			if (!base) return;
			if (!visible()) {
				if (!shown()) clearPuff();
				clearTimeout(blinkTimer); clearTimeout(eyelidTimer); clearTimeout(mouthTimer);
				blinkTimer = eyelidTimer = mouthTimer = undefined;
				blinking = mouthOpen = false; paint(); return;
			}
			if (blinkTimer === undefined && eyelidTimer === undefined) nextBlink();
			if (assistant.dataset.speaking === "true") { if (mouthTimer === undefined) speak(); }
			else { clearTimeout(mouthTimer); mouthTimer = undefined; mouthOpen = false; paint(); }
		};
		const load = () => {
			if (!image.naturalWidth) return;
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = "high";
			context.drawImage(image, 0, 0, 80, 80);
			base = context.getImageData(0, 0, 80, 80);
			image.hidden = true; canvas.hidden = false; paint(); sync();
		};
		const observer = new MutationObserver(sync);
		observer.observe(drawer, { attributes: true, attributeFilter: ["inert", "data-mode"] });
		observer.observe(assistant, { attributes: true, attributeFilter: ["data-speaking"] });
		document.addEventListener("visibilitychange", sync);
		reduced.addEventListener("change", sync);
		touch?.addEventListener("click", puff);
		if (image.complete) load(); else image.addEventListener("load", load, { once: true });
		poutImage?.addEventListener("load", paint);
		this.dispose = () => {
			clearPuff(); touch?.removeEventListener("click", puff);
			clearTimeout(blinkTimer); clearTimeout(eyelidTimer); clearTimeout(mouthTimer);
			observer.disconnect(); image.removeEventListener("load", load);
			poutImage?.removeEventListener("load", paint);
			document.removeEventListener("visibilitychange", sync); reduced.removeEventListener("change", sync);
		};
	}
	disconnectedCallback() { this.dispose?.(); }
}
if (!customElements.get("animated-agent-avatar")) customElements.define("animated-agent-avatar", AnimatedAgentAvatar);
