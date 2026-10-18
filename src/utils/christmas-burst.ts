export function createChristmasBurst(random = Math.random) {
	const kinds = ["candy", "snowflake", "bell", "star", "tree", "stocking"] as const;
	const colors = ["#b94339", "#44775b", "#608faa", "#ab6588"];
	return Array.from({ length: 8 }, () => {
		const kind = kinds[Math.min(kinds.length - 1, Math.floor(random() * kinds.length))];
		return {
			kind,
			x: (random() - 0.5) * 60,
			y: 44 + random() * 28,
			rotation: -45 + random() * 90,
			size: 12 + random() * 6,
			duration: 480 + random() * 160,
			delay: random() * 70,
			color: colors[Math.min(colors.length - 1, Math.floor(random() * colors.length))],
		};
	});
}

/** A narrow, gently bending stream with continuous downward acceleration. */
export function createChristmasFallFrames(spec: ReturnType<typeof createChristmasBurst>[number]) {
	return Array.from({ length: 9 }, (_, index) => {
		const t = index / 8;
		const x = spec.x * Math.sin(t * Math.PI / 2);
		const y = spec.y * (0.2 * t + 0.8 * t * t);
		const scale = 0.65 + 0.35 * Math.sin(Math.PI * t);
		return {
			offset: t,
			opacity: t < 0.125 ? t * 7.2 : 0.9 * Math.min(1, (1 - t) / 0.4),
			transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale}) rotate(${spec.rotation * t}deg)`,
		};
	});
}
