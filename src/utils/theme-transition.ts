export const themeTransitionTiming = { exit: 100, enter: 100, pageHold: 260, palette: 180, reveal: 260 } as const;
// Keep the icon quick; the page gets a distinct loading hold and palette settling phase.
export async function transitionTheme(
	updateIcon: () => void,
	applyTheme: () => void | Promise<void>,
	reducedMotion: boolean,
	wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
	if (!reducedMotion) await wait(themeTransitionTiming.exit);
	updateIcon();
	if (!reducedMotion) {
		await wait(themeTransitionTiming.enter);
		await wait(themeTransitionTiming.pageHold);
	}
	const ready = applyTheme();
	if (ready && typeof ready.then === "function") await ready;
	if (!reducedMotion) await wait(themeTransitionTiming.palette);
}
