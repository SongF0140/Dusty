// Flash defaults to thinking on the official endpoint. Our bounded blog loop
// needs final text and tool calls within its existing output and time budgets.
export function blogModelFetch(fetcher: typeof fetch = fetch): typeof fetch {
	return async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
		const url = new URL(input instanceof Request ? input.url : input);
		if (
			url.hostname !== "api.deepseek.com" ||
			!/^\/(?:v1\/)?chat\/completions\/?$/.test(url.pathname)
		)
			return fetcher(input, init);
		const request = new Request(input, init);
		if (request.method !== "POST") return fetcher(input, init);
		const body = await request.json();
		body.thinking = { type: "disabled" };
		if (body.max_completion_tokens !== undefined) {
			body.max_tokens ??= body.max_completion_tokens;
			delete body.max_completion_tokens;
		}
		return fetcher(new Request(request, { body: JSON.stringify(body) }));
	};
}
