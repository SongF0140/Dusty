import {
	chooseGardenReaction,
	chooseGardenScene,
	GardenMotion,
	type GardenReaction,
	type GardenSceneId,
} from "@/utils/garden-companion-motion";

type SceneAsset = {
	id: GardenSceneId;
	background: string;
	atlas: string;
	width: number;
	height: number;
};

class GardenCompanion extends HTMLElement {
	private events?: AbortController;
	private visibility?: IntersectionObserver;
	private portraitObserver?: MutationObserver;
	private timer?: number;
	private deadline = 0;
	private remaining = 0;
	private active = false;
	private inView = false;
	private ready = false;
	private wasFlipped = false;
	private loadRevision = 0;
	private lastGreeting?: GardenReaction;
	private portrait?: HTMLElement;
	private reducedMotion?: MediaQueryList;
	private assets?: Record<GardenSceneId, SceneAsset>;
	private committed?: SceneAsset;
	private motion = new GardenMotion();

	connectedCallback() {
		this.cleanup();
		const events = new AbortController();
		this.events = events;
		const options = { signal: events.signal };
		const portrait = this.closest<HTMLElement>("profile-portrait");
		const manifest = this.querySelector<HTMLScriptElement>(
			"[data-garden-assets]",
		);
		if (!portrait || !manifest?.textContent) return;
		this.assets = JSON.parse(manifest.textContent) as Record<
			GardenSceneId,
			SceneAsset
		>;
		this.portrait = portrait;
		this.wasFlipped = portrait.dataset.flipped === "true";
		this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => this.updateActivity();
		this.portraitObserver = new MutationObserver(() => {
			const flipped = portrait.dataset.flipped === "true";
			if (this.wasFlipped && !flipped) {
				void this.loadScene(chooseGardenScene(this.motion.scene));
			}
			this.wasFlipped = flipped;
			update();
		});
		this.portraitObserver.observe(portrait, {
			attributes: true,
			attributeFilter: ["data-curtain", "data-flipped"],
		});
		this.visibility = new IntersectionObserver(
			([entry]) => {
				this.inView = entry.isIntersecting;
				update();
			},
			{ threshold: 0.1 },
		);
		this.visibility.observe(portrait);
		document.addEventListener("visibilitychange", update, options);
		this.reducedMotion.addEventListener("change", update, options);
		portrait.addEventListener("portrait:interact", () => this.greet(), options);
		// Choose in the visitor's browser, including the very first reveal.
		void this.loadScene(chooseGardenScene());
	}

	private async loadScene(id: GardenSceneId) {
		const asset = this.assets?.[id];
		const scene = this.querySelector<HTMLImageElement>("[data-garden-scene]");
		const atlas = this.querySelector<SVGImageElement>("[data-garden-atlas]");
		if (!asset || !scene || !atlas) return;
		const revision = ++this.loadRevision;
		this.pause();
		this.ready = false;
		this.dataset.ready = "false";
		const background = new Image();
		const sprite = new Image();
		background.src = asset.background;
		sprite.src = asset.atlas;
		try {
			await Promise.all([background.decode(), sprite.decode()]);
			if (
				revision !== this.loadRevision ||
				this.events?.signal.aborted ||
				!this.isConnected
			)
				return;
			// Commit the whole scene in one task, after both images have decoded.
			scene.src = asset.background;
			scene.width = background.naturalWidth;
			scene.height = background.naturalHeight;
			atlas.setAttribute("href", asset.atlas);
			atlas.setAttribute("width", String(asset.width));
			atlas.setAttribute("height", String(asset.height));
			this.committed = asset;
			this.motion = new GardenMotion(id);
			this.lastGreeting = undefined;
			this.remaining = 0;
			this.ready = true;
			this.dataset.ready = "true";
			this.render();
			this.updateActivity();
		} catch {
			if (revision !== this.loadRevision || this.events?.signal.aborted) return;
			// A failed replacement keeps the last complete scene usable.
			this.ready = Boolean(this.committed);
			this.dataset.ready = String(this.ready);
			this.updateActivity();
		}
	}

	private updateActivity() {
		const canRun =
			this.ready &&
			this.inView &&
			!document.hidden &&
			this.portrait?.dataset.curtain === "open" &&
			this.portrait.dataset.flipped === "true" &&
			!this.reducedMotion?.matches;
		if (canRun === this.active) return;
		if (!canRun) this.pause();
		else {
			this.active = true;
			this.dataset.active = "true";
			this.render();
			this.schedule(this.remaining || this.motion.current.duration);
		}
	}

	private render() {
		const frame = this.motion.current;
		const asset = this.committed;
		if (!asset) return;
		this.dataset.scene = frame.scene;
		this.dataset.action = frame.action;
		this.dataset.posture = frame.posture;
		this.dataset.reaction = frame.reaction;
		this.dataset.frame = String(frame.frameIndex);
		const width = asset.width / 4;
		const height = asset.height / 2;
		this.querySelector<SVGSVGElement>("[data-garden-frame]")?.setAttribute(
			"viewBox",
			`${frame.column * width} ${frame.row * height} ${width} ${height}`,
		);
		this.setAttribute("aria-label", frame.label);
	}

	private schedule(duration: number) {
		clearTimeout(this.timer);
		this.remaining = duration;
		this.deadline = performance.now() + duration;
		this.timer = window.setTimeout(() => {
			if (!this.active) return;
			this.motion.advance();
			this.render();
			this.schedule(this.motion.current.duration);
		}, duration);
	}

	private greet() {
		if (!this.active) return;
		const greeting = chooseGardenReaction(this.motion.scene, this.lastGreeting);
		if (!this.motion.react(greeting)) return;
		this.lastGreeting = greeting;
		this.render();
		this.schedule(this.motion.current.duration);
	}

	private pause() {
		if (this.active)
			this.remaining = Math.max(1, this.deadline - performance.now());
		clearTimeout(this.timer);
		this.active = false;
		this.dataset.active = "false";
	}

	private cleanup() {
		this.pause();
		++this.loadRevision;
		this.events?.abort();
		this.visibility?.disconnect();
		this.portraitObserver?.disconnect();
		this.inView = false;
		this.ready = false;
		this.dataset.ready = "false";
	}

	disconnectedCallback() {
		this.cleanup();
	}
}

if (!customElements.get("garden-companion"))
	customElements.define("garden-companion", GardenCompanion);
