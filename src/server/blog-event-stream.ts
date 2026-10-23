import { sanitizeAssistantAnswer } from "../utils/blog-assistant-policy.ts";
import type { QueueSnapshot } from "./blog-queue.ts";

/** A bounded SSE reader of the durable worker's actual output, reconnectable by request ID. */
export function queueEventStream(
	initial: QueueSnapshot,
	read: () => Promise<QueueSnapshot | undefined>,
	urls: string[],
	options: { wait?(): Promise<unknown>; durationMs?: number } = {},
) {
	const lifetime = new AbortController();
	const encoder = new TextEncoder();
	let stopped = false;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				if (!stopped)
					controller.enqueue(
						encoder.encode(
							`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
						),
					);
			};
			const deadline = Date.now() + (options.durationMs ?? 25000);
			let row: QueueSnapshot | undefined = initial;
			let previous = "";
			try {
				while (!stopped && row) {
					if (row.status === "completed") {
						send("done", row.result);
						break;
					}
					if (row.status === "failed") {
						send("failure", {
							error: row.error || "本次回答失败，请重新发送。",
						});
						break;
					}
					const answer = sanitizeAssistantAnswer(
						row.partial_answer || "",
						urls,
					);
					if (answer !== previous || previous === "") {
						send("update", { answer });
						previous = answer;
					}
					if (Date.now() >= deadline) {
						send("reconnect", {});
						break;
					}
					if (options.wait) await options.wait();
					else
						await new Promise<void>((resolve) => {
							const timer = setTimeout(done, 650);
							function done() {
								clearTimeout(timer);
								lifetime.signal.removeEventListener("abort", done);
								resolve();
							}
							lifetime.signal.addEventListener("abort", done, { once: true });
						});
					if (stopped) break;
					row = await read();
				}
			} catch {
				send("failure", { error: "连接暂时中断，请刷新后继续接收。" });
			} finally {
				if (!stopped) controller.close();
			}
		},
		cancel() {
			stopped = true;
			lifetime.abort();
		},
	});
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache, no-transform",
			"X-Accel-Buffering": "no",
		},
	});
}
