export const POST_ART_COUNT = 13;
export function resolvePostArt(index: number, counts: readonly number[]) {
	if (!Number.isInteger(index) || index < 0) throw new RangeError("Invalid artwork index");
	let column = index;
	for (let sheetIndex = 0; sheetIndex < counts.length; sheetIndex++) {
		if (column < counts[sheetIndex]) return { sheetIndex, column };
		column -= counts[sheetIndex];
	}
	throw new RangeError("Artwork index exceeds atlas size");
}
export const POST_ART_VISIT_KEY = "dusty:post-art:first:v1";
type ArtStorage = Pick<Storage, "getItem" | "setItem">;

export class PostArtShuffleBag {
	private bag: number[] = [];
	private previous?: number;
	private random: () => number;

	constructor(random = Math.random, previous?: number) {
		this.random = random;
		this.previous = previous;
	}

	next(): number {
		if (!this.bag.length) {
			this.bag = Array.from({ length: POST_ART_COUNT }, (_, index) => index);
			for (let i = this.bag.length - 1; i > 0; i--) {
				const j = Math.floor(this.random() * (i + 1));
				[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
			}
			if (this.bag[0] === this.previous)
				[this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
		}
		this.previous = this.bag.shift() as number;
		return this.previous;
	}
}

export function createVisitArtPicker(
	storage: ArtStorage | null,
	random = Math.random,
) {
	let previous: number | undefined;
	try {
		const raw = storage?.getItem(POST_ART_VISIT_KEY);
		const value = raw == null ? -1 : Number(raw);
		if (Number.isInteger(value) && value >= 0 && value < POST_ART_COUNT)
			previous = value;
	} catch {}
	const picker = new PostArtShuffleBag(random, previous);
	let first = true;
	return {
		next() {
			const index = picker.next();
			if (first) {
				first = false;
				try {
					storage?.setItem(POST_ART_VISIT_KEY, String(index));
				} catch {}
			}
			return index;
		},
	};
}
