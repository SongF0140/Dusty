import { createHash, randomUUID } from "node:crypto";
import type {
	BlogAnswer,
	BlogQuestion,
} from "../../vendor/starrylin/agent.mjs";
import { progressPublisher } from "./blog-agent-stream.ts";
export interface QueueSnapshot {
	status: string;
	result?: BlogAnswer;
	error?: string;
	partial_answer?: string;
}
export type QueueQuery = (
	sql: string,
	values: unknown[],
) => Promise<Record<string, unknown>[]>;
export function blogQuotaDay(now = new Date()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Shanghai",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}
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
	async quota(userId: string, now = new Date()) {
		const day = blogQuotaDay(now);
		// One snapshot counts charged runs plus reservations, never both for a running job.
		const rows = await this.query(
			`SELECT
		 coalesce((SELECT used FROM blog_usage WHERE user_id=$1 AND day=$2),0) +
		 (SELECT count(*) FROM blog_queue q WHERE q.user_id=$1 AND q.day=$2 AND
		 (q.status='pending' OR (q.status='running' AND NOT EXISTS
		 (SELECT 1 FROM blog_runs r WHERE r.user_id=q.user_id AND r.request_id=q.request_id)))) AS used`,
			[userId, day],
		);
		const used = Math.max(0, Math.min(20, Number(rows[0]?.used || 0)));
		const resetsAt = new Date(
			new Date(`${day}T00:00:00+08:00`).getTime() + 86400000,
		).toISOString();
		return { limit: 20, used, remaining: 20 - used, day, resetsAt };
	}
	async enqueue(input: QueueInput) {
		const day = blogQuotaDay();
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
			"SELECT status,result,error,partial_answer FROM blog_queue WHERE user_id=$1 AND request_id=$2",
			[userId, requestId],
		);
		const row = rows[0];
		if (!row || typeof row.status !== "string") return undefined;
		return { ...row, status: row.status } as QueueSnapshot;
	}
	async progress(
		job: Pick<QueueJob, "userId" | "requestId" | "leaseId">,
		text: string,
	) {
		await this.query(
			"UPDATE blog_queue SET partial_answer=$4 WHERE user_id=$1 AND request_id=$2 AND lease_id=$3 AND status='running'",
			[job.userId, job.requestId, job.leaseId, text.slice(0, 16000)],
		);
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
	ask: (
		input: QueueInput,
		onText?: (text: string) => void,
	) => Promise<BlogAnswer>,
	wake: () => Promise<void>,
) {
	const job = await queue.claim();
	if (!job) return;
	const progress = progressPublisher((text) => queue.progress(job, text));
	try {
		const answer = await ask(job.payload, progress.update);
		await progress.flush();
		await queue.finish(job, answer, null);
	} catch (error) {
		await progress.flush();
		const message =
			error instanceof Error &&
			/20 次|会话|重复|中断|预算|^模型服务/.test(error.message)
				? error.message
				: "本次回答失败，请稍后重新发送。";
		await queue.finish(job, null, message);
	} finally {
		await wake();
	}
}
