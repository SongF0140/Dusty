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

/** Server snapshots plus sends not yet acknowledged by the queue. */
export class BlogQuotaCounter {
	private snapshot: BlogQuota | null = null;
	private reservations = new Set<string>();
	private revision = 0;

	get version() {
		return this.revision;
	}
	get hasReservations() {
		return this.reservations.size > 0;
	}
	get current(): BlogQuota | null {
		if (!this.snapshot) return null;
		const used = Math.min(20, this.snapshot.used + this.reservations.size);
		return { ...this.snapshot, used, remaining: 20 - used };
	}
	sync(value: unknown, acknowledgedId?: string) {
		if (acknowledgedId) this.reservations.delete(acknowledgedId);
		this.snapshot = readBlogQuota(value);
		this.revision++;
	}
	reserve(id: string) {
		if (this.reservations.has(id)) return;
		this.reservations.add(id);
		this.revision++;
	}
	release(id: string) {
		if (this.reservations.delete(id)) this.revision++;
	}
	clearReservations() {
		this.reservations.clear();
		this.revision++;
	}
}
