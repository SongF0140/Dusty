export interface BlogQuota {
	limit: number;
	used: number;
	remaining: number;
	day: string;
	resetsAt: string;
}

export function readBlogQuota(value: unknown): BlogQuota | null {
	if (!value || typeof value !== "object") return null;
	const q = value as BlogQuota;
	return q.limit === 20 &&
		Number.isInteger(q.used) &&
		q.used >= 0 &&
		q.used <= 20 &&
		q.remaining === 20 - q.used &&
		typeof q.day === "string" &&
		/^\d{4}-\d{2}-\d{2}$/.test(q.day) &&
		typeof q.resetsAt === "string" &&
		Number.isFinite(Date.parse(q.resetsAt))
		? q
		: null;
}
