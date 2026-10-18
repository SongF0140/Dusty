export function readingNoteKey(path: string) {
	let normalized = path.split(/[?#]/)[0];
	try { normalized = decodeURIComponent(normalized); } catch { /* Keep malformed paths distinct. */ }
	return `dusty:reading-note:v1:${normalized.replace(/\/+$/, "") || "/"}`;
}

export function loadReadingNote(storage: Pick<Storage, "getItem">, path: string) {
	try { return storage.getItem(readingNoteKey(path)) || ""; } catch { return ""; }
}

export function saveReadingNote(storage: Pick<Storage, "setItem" | "removeItem">, path: string, text: string) {
	try {
		if (text) storage.setItem(readingNoteKey(path), text);
		else storage.removeItem(readingNoteKey(path));
		return true;
	} catch { return false; }
}
