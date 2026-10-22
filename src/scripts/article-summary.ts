import { createProgressiveText } from "../utils/progressive-text";

class ArticleSummary extends HTMLElement {
	private dispose?: () => void;
	connectedCallback() {
		this.dispose?.();
		const output = this.querySelector<HTMLElement>("[data-summary-output]");
		const text = this.dataset.summary;
		if (!output || !text) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		const writer = createProgressiveText(
			text,
			(part, complete) => {
				output.textContent = part;
				this.dataset.complete = String(complete);
			},
			{
				schedule: (fn, ms) => window.setTimeout(fn, ms),
				cancel: (id) => window.clearTimeout(id),
			},
		);
		output.textContent = "";
		this.dataset.complete = "false";
		let visible = false;
		const sync = () => {
			if (reduced.matches) {
				writer.finish();
				return;
			}
			if (visible && !document.hidden) writer.resume();
			else writer.pause();
		};
		const observer = new IntersectionObserver(
			(entries) => {
				visible = entries.some((entry) => entry.isIntersecting);
				sync();
			},
			{ threshold: 0.05 },
		);
		observer.observe(this);
		document.addEventListener("visibilitychange", sync);
		reduced.addEventListener("change", sync);
		if (reduced.matches) writer.finish();
		this.dispose = () => {
			writer.stop();
			observer.disconnect();
			document.removeEventListener("visibilitychange", sync);
			reduced.removeEventListener("change", sync);
		};
	}
	disconnectedCallback() {
		this.dispose?.();
	}
}
if (!customElements.get("article-summary"))
	customElements.define("article-summary", ArticleSummary);
