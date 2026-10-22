// Generated from StarryLin packages/blog-agent/src/rag.ts; edit the source and export again.
/** Pure, portable RAG indexing. This file is also exported to the static blog. */
export interface RagPost {
	id: string;
	title: string;
	url: string;
	body: string;
	description?: string;
	tags?: string[];
	category?: string;
	draft?: boolean;
	password?: string;
}
export interface RagChunk {
	id: string;
	postId: string;
	heading: string;
	path: string[];
	start: number;
	end: number;
	text: string;
}
export interface RagDocument {
	id: string;
	revision: string;
	description: string;
	chunks: RagChunk[];
}
export interface RagIndex {
	version: 1;
	revision: string;
	documents: RagDocument[];
	updated: string[];
	removed: string[];
}

/** Non-security content revision; summary caches use SHA-256 on the server. */
function revision(text: string): string {
	let a = 2166136261;
	let b = 5381;
	for (let i = 0; i < text.length; i++) {
		a = Math.imul(a ^ text.charCodeAt(i), 16777619);
		b = Math.imul(b, 33) ^ text.charCodeAt(i);
	}
	return `${text.length.toString(36)}-${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`;
}

export function queryTerms(query: string): string[] {
	const stop = new Set([
		"请",
		"介绍",
		"一下",
		"如何",
		"怎么",
		"什么",
		"为什么",
		"的",
		"了",
		"吗",
		"呢",
		"是",
		"我",
		"想",
		"知道",
		"文章",
		"博客",
		"这篇",
		"本文",
		"讲",
		"核心",
		"观点",
	]);
	return [
		...new Set(
			[
				...new Intl.Segmenter("zh", { granularity: "word" }).segment(
					query.toLowerCase(),
				),
			]
				.filter((item) => item.isWordLike && !stop.has(item.segment))
				.map((item) => item.segment),
		),
	].slice(0, 32);
}

export function splitPost(
	post: Pick<RagPost, "id" | "title" | "body">,
): RagChunk[] {
	const sections: { start: number; end: number; path: string[] }[] = [];
	let start = 0;
	let offset = 0;
	let path: string[] = [];
	let fence: { char: string; length: number } | undefined;
	for (const line of post.body.split(/(?<=\n)/)) {
		const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
		if (marker) {
			if (!fence) fence = { char: marker[1][0], length: marker[1].length };
			else if (
				marker[1][0] === fence.char &&
				marker[1].length >= fence.length &&
				/^\s*$/.test(line.slice(marker[0].length))
			)
				fence = undefined;
		} else if (!fence) {
			const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line.trimEnd());
			if (heading) {
				if (offset > start && post.body.slice(start, offset).trim())
					sections.push({ start, end: offset, path: [...path] });
				start = offset;
				path = [...path.slice(0, heading[1].length - 1), heading[2]];
			}
		}
		offset += line.length;
	}
	if (post.body.slice(start).trim())
		sections.push({ start, end: post.body.length, path });
	const chunks: RagChunk[] = [];
	for (const section of sections) {
		let cursor = section.start;
		while (cursor < section.end) {
			let end = Math.min(cursor + 1600, section.end);
			if (end < section.end) {
				const candidate = post.body.slice(cursor, end);
				const paragraph = candidate.lastIndexOf("\n\n");
				const sentence = Math.max(
					candidate.lastIndexOf("。"),
					candidate.lastIndexOf("\n"),
				);
				const boundary =
					paragraph >= 800
						? paragraph + 2
						: sentence >= 800
							? sentence + 1
							: -1;
				if (boundary > 0) end = cursor + boundary;
				if (/[\uD800-\uDBFF]/.test(post.body[end - 1])) end--;
			}
			const text = post.body.slice(cursor, end);
			if (text.trim())
				chunks.push({
					id: `${post.id}::${chunks.length}-${revision(text)}`,
					postId: post.id,
					heading: section.path.at(-1) || post.title,
					path: [...section.path],
					start: cursor,
					end,
					text,
				});
			if (end >= section.end) break;
			cursor = end - 120;
			if (/[\uDC00-\uDFFF]/.test(post.body[cursor])) cursor--;
		}
	}
	return chunks;
}

export function buildRagIndex(
	posts: readonly RagPost[],
	previous?: RagIndex,
): RagIndex {
	const old = new Map(previous?.documents.map((doc) => [doc.id, doc]));
	const documents: RagDocument[] = [];
	const updated: string[] = [];
	for (const post of [...posts]
		.filter((post) => !post.draft && !post.password)
		.sort((a, b) => a.id.localeCompare(b.id))) {
		const key = revision(
			JSON.stringify([
				post.title,
				post.description,
				post.body,
				post.tags,
				post.category,
				post.url,
			]),
		);
		const existing = old.get(post.id);
		if (existing?.revision === key) documents.push(existing);
		else {
			documents.push({
				id: post.id,
				revision: key,
				description: post.description || "",
				chunks: splitPost(post),
			});
			updated.push(post.id);
		}
	}
	const ids = new Set(documents.map((doc) => doc.id));
	return {
		version: 1,
		revision: revision(
			JSON.stringify(documents.map((doc) => [doc.id, doc.revision])),
		),
		documents,
		updated,
		removed: [...old.keys()].filter((id) => !ids.has(id)).sort(),
	};
}

/** BM25 ranks body terms, with extra weight for section headings. Never truncates evidence. */
export function retrieveChunks(
	query: string,
	chunks: readonly RagChunk[],
	options: { limit?: number; maxChars?: number } = {},
): RagChunk[] {
	const terms = queryTerms(query);
	if (!terms.length || !chunks.length) return [];
	const tokenized = chunks.map((chunk) => queryTermsForBody(chunk.text));
	const average =
		tokenized.reduce((sum, tokens) => sum + tokens.length, 0) / chunks.length ||
		1;
	const frequencies = terms.map(
		(term) => tokenized.filter((tokens) => tokens.includes(term)).length,
	);
	const scored = chunks
		.map((chunk, i) => {
			let score = 0;
			for (let t = 0; t < terms.length; t++) {
				const frequency = tokenized[i].filter(
					(token) => token === terms[t],
				).length;
				if (frequency)
					score +=
						(Math.log(
							1 +
								(chunks.length - frequencies[t] + 0.5) / (frequencies[t] + 0.5),
						) *
							frequency *
							2.2) /
						(frequency + 1.2 * (0.25 + (0.75 * tokenized[i].length) / average));
				if (chunk.path.join(" ").toLowerCase().includes(terms[t])) score += 2;
			}
			return { chunk, score };
		})
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score || a.chunk.start - b.chunk.start);
	const selected: RagChunk[] = [];
	const budget = Math.max(0, options.maxChars ?? 10000);
	for (const item of scored) {
		if (selected.length >= Math.min(8, Math.max(0, options.limit ?? 4))) break;
		if (JSON.stringify([...selected, item.chunk]).length <= budget)
			selected.push(item.chunk);
	}
	return selected;
}

function queryTermsForBody(text: string): string[] {
	return [
		...new Intl.Segmenter("zh", { granularity: "word" }).segment(
			text.toLowerCase(),
		),
	]
		.filter((item) => item.isWordLike)
		.map((item) => item.segment);
}
