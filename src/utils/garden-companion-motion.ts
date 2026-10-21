export type GardenReaction = "smile" | "tilt" | "wave";
type GardenPosture = "standing" | "seated" | "resting";
type Scene = {
	posture: GardenPosture;
	props: "none" | "tea-table" | "stove" | "cushion" | "vine-column";
	label: string;
	wave: boolean;
	frames: number[];
	durations: number[];
};

export const GARDEN_SCENES = {
	bubbles: {
		posture: "standing",
		props: "none",
		label: "海问香在花园里吹泡泡",
		wave: true,
		frames: [0, 1, 2, 3],
		durations: [1800, 140, 1300, 1600],
	},
	tea: {
		posture: "seated",
		props: "tea-table",
		label: "海问香坐在茶桌旁喝下午茶",
		wave: true,
		frames: [0, 1, 2, 3],
		durations: [2000, 140, 2200, 1800],
	},
	cooking: {
		posture: "standing",
		props: "stove",
		label: "海问香在厨房里搅拌锅中的料理",
		wave: false,
		frames: [0, 1, 2, 3],
		durations: [1100, 140, 1100, 1500],
	},
	moon: {
		posture: "seated",
		props: "cushion",
		label: "海问香坐在花园露台上赏月",
		wave: true,
		frames: [0, 1, 2, 3],
		durations: [2500, 150, 2300, 2000],
	},
	sleep: {
		posture: "resting",
		props: "cushion",
		label: "海问香蜷在软垫上小睡",
		wave: false,
		frames: [1, 2, 1, 1],
		durations: [3200, 800, 2800, 2400],
	},
	gardening: {
		posture: "standing",
		props: "vine-column",
		label: "海问香站在花园石廊里，修剪花柱上多余的藤蔓",
		wave: false,
		frames: [0, 1, 2, 3],
		durations: [1300, 140, 900, 1800],
	},
	flute: {
		posture: "standing",
		props: "none",
		label: "海问香站在花园石廊里吹笛子",
		wave: false,
		frames: [0, 1, 2, 3],
		durations: [1500, 140, 1500, 2000],
	},
} satisfies Record<string, Scene>;

export type GardenSceneId = keyof typeof GARDEN_SCENES;

function pick<T>(choices: T[], random: () => number): T {
	return choices[
		Math.min(
			choices.length - 1,
			Math.max(0, Math.floor(random() * choices.length)),
		)
	];
}

export function chooseGardenScene(
	previous?: GardenSceneId,
	random = Math.random,
): GardenSceneId {
	return pick(
		(Object.keys(GARDEN_SCENES) as GardenSceneId[]).filter(
			(id) => id !== previous,
		),
		random,
	);
}

export function chooseGardenReaction(
	scene: GardenSceneId,
	previous?: GardenReaction,
	random = Math.random,
): GardenReaction {
	const choices: GardenReaction[] = GARDEN_SCENES[scene].wave
		? ["smile", "tilt", "wave"]
		: ["smile", "tilt"];
	return pick(
		choices.filter((kind) => kind !== previous),
		random,
	);
}

// -1 restores the current activity frame; no second arm is composited over it.
const reactions = {
	smile: { frames: [-1, 4, 4, -1], durations: [140, 360, 420, 180] },
	tilt: { frames: [-1, 5, 5, -1], durations: [160, 400, 420, 180] },
	wave: { frames: [-1, 6, 7, 6, -1], durations: [160, 240, 280, 240, 180] },
};
const reactionLabels: Record<GardenReaction, string> = {
	smile: "轻轻向你微笑",
	tilt: "微微歪头看向你",
	wave: "轻轻挥手回应你",
};

export class GardenMotion {
	readonly scene: GardenSceneId;
	private step = 0;
	private reaction?: { kind: GardenReaction; step: number };

	constructor(scene: GardenSceneId = "bubbles") {
		this.scene = scene;
	}

	get current() {
		const config = GARDEN_SCENES[this.scene];
		const gesture = this.reaction && reactions[this.reaction.kind];
		const gestureFrame = gesture?.frames[this.reaction?.step ?? 0];
		const frameIndex =
			gestureFrame !== undefined && gestureFrame >= 0
				? gestureFrame
				: config.frames[this.step];
		return {
			scene: this.scene,
			action: this.scene,
			posture: config.posture,
			frameIndex,
			row: Math.floor(frameIndex / 4),
			column: frameIndex % 4,
			duration:
				gesture?.durations[this.reaction?.step ?? 0] ??
				config.durations[this.step],
			reaction: this.reaction?.kind ?? "none",
			label:
				config.label +
				(this.reaction ? `，${reactionLabels[this.reaction.kind]}` : ""),
		};
	}

	react(kind: GardenReaction) {
		if (this.reaction || (kind === "wave" && !GARDEN_SCENES[this.scene].wave))
			return false;
		this.reaction = { kind, step: 0 };
		return true;
	}

	advance() {
		if (this.reaction) {
			if (++this.reaction.step >= reactions[this.reaction.kind].frames.length)
				this.reaction = undefined;
			return;
		}
		this.step = (this.step + 1) % GARDEN_SCENES[this.scene].frames.length;
	}
}
