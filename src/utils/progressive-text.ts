export const TYPEWRITER_TIMING = {
	character: 85,
	initial: 160,
	line: 260,
} as const;

/** Shared timing and grapheme-safe reveal for Haiwenxiang's verse and article summaries. */
export function createProgressiveText(
	text: string,
	render: (text: string, complete: boolean) => void,
	clock: {
		schedule(fn: () => void, ms: number): number;
		cancel(id: number): void;
	},
) {
	const characters = [
		...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text),
	].map((item) => item.segment);
	let cursor = 0;
	let timer: number | undefined;
	let stopped = false;
	let complete = false;
	const pause = () => {
		if (timer !== undefined) clock.cancel(timer);
		timer = undefined;
	};
	const tick = () => {
		timer = undefined;
		if (stopped || complete) return;
		cursor++;
		complete = cursor >= characters.length;
		render(characters.slice(0, cursor).join(""), complete);
		if (!complete)
			timer = clock.schedule(
				tick,
				/[。！？；，、\n]$/.test(characters[cursor - 1])
					? TYPEWRITER_TIMING.line
					: TYPEWRITER_TIMING.character,
			);
	};
	return {
		pause,
		resume() {
			if (!stopped && !complete && timer === undefined)
				timer = clock.schedule(
					tick,
					cursor ? TYPEWRITER_TIMING.character : TYPEWRITER_TIMING.initial,
				);
		},
		finish() {
			pause();
			complete = true;
			cursor = characters.length;
			render(text, true);
		},
		stop() {
			pause();
			stopped = true;
		},
	};
}
