import { createVisitArtPicker } from "@/utils/post-card-art";

type ArtSheet = { src: string; width: number; height: number; count: number };
const visits = new WeakMap<
	HTMLElement,
	ReturnType<typeof createVisitArtPicker>
>();

class PostCardArt extends HTMLElement {
	connectedCallback() {
		if (this.dataset.artAssigned === "true") return;
		const viewport = this.querySelector<SVGSVGElement>("svg");
		const image = this.querySelector<SVGImageElement>("image");
		const container =
			this.closest<HTMLElement>("#post-list-container") ?? this.parentElement;
		const sheets = JSON.parse(this.dataset.artSheets ?? "[]") as ArtSheet[];
		if (!viewport || !image || !container || sheets.length !== 2) return;
		let picker = visits.get(container);
		if (!picker) {
			let storage: Storage | null = null;
			try {
				storage = window.localStorage;
			} catch {}
			picker = createVisitArtPicker(storage);
			visits.set(container, picker);
		}
		const index = picker.next();
		const sheet = sheets[index < 4 ? 0 : 1];
		const column = index < 4 ? index : index - 4;
		const width = sheet.width / sheet.count;
		image.setAttribute("href", sheet.src);
		image.setAttribute("width", String(sheet.width));
		image.setAttribute("height", String(sheet.height));
		viewport.setAttribute(
			"viewBox",
			`${column * width} 0 ${width} ${sheet.height}`,
		);
		this.dataset.artIndex = String(index);
		this.dataset.artAssigned = "true";
	}
}

if (!customElements.get("post-card-art"))
	customElements.define("post-card-art", PostCardArt);
