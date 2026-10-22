import { createHash, randomUUID } from "node:crypto";
import type {
	BlogAnswer,
	BlogQuestion,
} from "../../vendor/starrylin/agent.mjs";
export type QueueQuery = (
	sql: string,
	values: unknown[],
) => Promise<Record<string, unknown>[]>;
export interface QueueInput extends BlogQuestion {
	articleIds?: string[];
}
export interface QueueJob {
	userId: string;
	requestId: string;
	leaseId: string;
	payload: QueueInput;
}
export class BlogQueue {
	private readonly query: QueueQuery;
	constructor(query: QueueQuery) {
		this.query = query;
	}
	async enqueue(input: QueueInput) {
		const day = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Shanghai",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date());
		const fingerprint = createHash("sha256")
			.update(
				JSON.stringify([
					input.conversationId,
					input.question,
					input.articleIds || [],
				]),
			)
			.digest("hex");
		const rows = await this.query(
			"SELECT blog_enqueue($1,$2,$3,$4,$5,$6::jsonb) AS value",
			[
				input.identity.id,
				input.requestId,
				input.conversationId,
				fingerprint,
				day,
				JSON.stringify(input),
			],
		);
		return String(rows[0]?.value);
	}
	async status(userId: string, requestId: string) {
		const rows = await this.query(
			"SELECT status,result,error FROM blog_queue WHERE user_id=$1 AND request_id=$2",
			[userId, requestId],
		);
		return rows[0] as
			| { status: string; result?: BlogAnswer; error?: string }
			| undefined;
	}
	async claim(): Promise<QueueJob | null> {
		const rows = await this.query("SELECT blog_claim($1,$2) AS value", [
			randomUUID(),
			Date.now(),
		]);
		return rows[0]?.value as QueueJob | null;
	}
	async finish(job: QueueJob, result: BlogAnswer | null, error: string | null) {
		await this.query("SELECT blog_finish($1,$2,$3,$4::jsonb,$5) AS value", [
			job.userId,
			job.requestId,
			job.leaseId,
			JSON.stringify(result),
			error,
		]);
	}
}

/** One bounded job per function invocation. Claiming never preempts an existing lease. */
export async function runQueueJob(
	queue: BlogQueue,
	ask: (input: QueueInput) => Promise<BlogAnswer>,
	wake: () => Promise<void>,
) {
	const job = await queue.claim();
	if (!job) return;
	try {
		await queue.finish(job, await ask(job.payload), null);
	} catch (error) {
		const message =
			error instanceof Error && /20 次|会话|重复|中断|预算/.test(error.message)
				? error.message
				: "本次回答失败，请稍后重新发送。";
		await queue.finish(job, null, message);
	} finally {
		await wake();
	}
}
