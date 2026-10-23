import { BLOG_ASSISTANT_VOICE } from "../utils/blog-assistant-policy.ts";

type ModelEvent = { type: string; delta?: string };
type ModelStream = (
	model: unknown,
	context: {
		systemPrompt?: string;
		messages?: { role: string; content?: unknown; [key: string]: unknown }[];
	},
	options: unknown,
) => AsyncIterable<ModelEvent> | Promise<AsyncIterable<ModelEvent>>;

/** Tap real Pi text deltas; never expose thinking or tool arguments. */
export function streamingBlogModel(
	stream: ModelStream,
	onText: (text: string) => void,
): ModelStream {
	return async function* (model, context, options) {
		let text = "";
		onText(text);
		const prompt = (text: string) =>
			text.replace("博客陪读助手海问香", "博客陪读助手 StarryLin") +
			`\n${BLOG_ASSISTANT_VOICE}\n默认120至220字，先把最重要的一点讲明白，再自然解释。保持温柔的口语节奏，不强制写成列表或分节提纲。用户要求详细讲解时再展开；仅在有帮助时补充扩展说明。`;
		const incoming = await stream(
			model,
			{
				...context,
				...(context.systemPrompt
					? { systemPrompt: prompt(context.systemPrompt) }
					: {}),
				...(context.messages
					? {
							messages: context.messages.map((message) =>
								message.role === "system" && typeof message.content === "string"
									? { ...message, content: prompt(message.content) }
									: message,
							),
						}
					: {}),
			},
			options,
		);
		for await (const event of incoming) {
			if (event.type === "text_delta" && typeof event.delta === "string") {
				text = (text + event.delta).slice(0, 16000);
				onText(text);
			}
			yield event;
		}
	};
}

/** Coalesce token bursts without holding up the model or overlapping writes. */
export function progressPublisher(
	write: (text: string) => Promise<void>,
	delay = 400,
) {
	let latest = "";
	let written = "";
	let timer: ReturnType<typeof setTimeout> | undefined;
	let tail = Promise.resolve();
	const flush = () => {
		clearTimeout(timer);
		timer = undefined;
		tail = tail.then(async () => {
			if (latest === written) return;
			const snapshot = latest;
			try {
				await write(snapshot);
				written = snapshot;
			} catch {
				/* Final answer persistence remains authoritative. */
			}
		});
		return tail;
	};
	return {
		update(text: string) {
			latest = text;
			if (!timer)
				timer = setTimeout(() => {
					void flush();
				}, delay);
		},
		flush,
	};
}
