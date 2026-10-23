/** Quote individual font names, never an entire fallback stack. */
export function serializeFontFamily(family: string): string {
	const names = family.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,]+/g) || [];
	return names.map((name: string) => {
		const value = name.trim();
		if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i.test(value)) return value;
		if (/^["']/.test(value)) return value;
		return JSON.stringify(value);
	}).join(", ");
}
