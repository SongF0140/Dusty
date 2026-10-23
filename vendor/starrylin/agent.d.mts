export interface BlogPost {
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
export interface BlogQuestion {
	identity: { provider: "github"; id: string };
	requestId: string;
	conversationId: string;
	question: string;
}
export interface BlogAnswer {
	answer: string;
	sources: Omit<BlogPost, "body" | "draft" | "password">[];
	modelCalls: number;
	toolCalls: number;
	replayed?: boolean;
}
export class BlogCatalog {
	constructor(posts: readonly BlogPost[]);
	list(): Omit<BlogPost, "body" | "draft" | "password">[];
}
export class PostgresRunStore {
	constructor(
		query: (
			sql: string,
			values: unknown[],
		) => Promise<Record<string, unknown>[]>,
	);
}
export function compatibleModel(config: {
	baseUrl: string;
	model: string;
	apiKey: string;
	fetch?: typeof fetch;
}): {
	model: unknown;
	streamFn: (
		model: unknown,
		context: {
			systemPrompt?: string;
			messages?: { role: string; content?: unknown; [key: string]: unknown }[];
		},
		options: unknown,
	) =>
		| AsyncIterable<{ type: string; delta?: string }>
		| Promise<AsyncIterable<{ type: string; delta?: string }>>;
};
export class BlogAgent {
	constructor(options: {
		catalog: BlogCatalog;
		store: PostgresRunStore;
		model: unknown;
		streamFn: unknown;
	});
	ask(input: BlogQuestion, signal?: AbortSignal): Promise<BlogAnswer>;
}
