export function getReadingProgress(top: number, height: number, viewport: number, anchor: number): number {
	if (height <= 0) return 0;
	if (height <= viewport - anchor) return Math.max(0, Math.min(1, (viewport - top) / height));
	return Math.max(0, Math.min(1, (anchor - top) / (height - viewport + anchor)));
}

export function getCurrentHeadingIndex(tops: number[], anchor: number): number {
	if (!tops.length) return -1;
	let current = 0;
	for (let index = 0; index < tops.length; index++) {
		if (tops[index] > anchor) break;
		current = index;
	}
	return current;
}

export function getReadingMarkerGeometry(rowTop: number, rowHeight: number, railTop: number, railHeight: number) {
	const center = rowTop + rowHeight / 2 - railTop;
	return {
		top: Math.max(0, Math.min(Math.max(0, railHeight - 28), center - 14)),
		fillHeight: Math.max(0, Math.min(railHeight, center)),
		visible: center >= 0 && center <= railHeight,
	};
}
