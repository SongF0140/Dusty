/** Safe, finite diagnostic codes; never expose provider response text. */
export function modelFailureCode(message: string): string {
	if (/max_completion_tokens|max_tokens/i.test(message))
		return "unsupported_max_tokens";
	if (/tool_choice|tools.*support|function.*support/i.test(message))
		return "unsupported_tools";
	if (/store.*support|unsupported.*store/i.test(message))
		return "unsupported_store";
	if (/401|403|invalid.*key|unauthoriz/i.test(message)) return "authentication";
	if (/429|rate.limit|quota|insufficient/i.test(message))
		return "quota_or_rate_limit";
	if (/timed?\s*out|timeout|aborted/i.test(message)) return "timeout";
	if (/404|model.*not.found|model.*not.exist/i.test(message))
		return "model_or_endpoint";
	if (/400|422|bad.request/i.test(message)) return "invalid_request";
	if (/502|503|504/i.test(message)) return "upstream_unavailable";
	return "unknown";
}

export function modelFailureMessage(code: string): string {
	if (code === "quota_or_rate_limit")
		return "模型服务额度不足或触发限流，请博主检查供应商余额、Key 配额和请求限制。未收到模型回答。";
	if (code === "authentication")
		return "模型服务认证失败，请博主检查模型 API Key。";
	if (code === "model_or_endpoint")
		return "模型服务地址或模型名称不可用，请博主检查配置。";
	if (code === "invalid_request")
		return "模型服务不接受当前请求格式，请博主检查接口兼容性。";
	return "模型服务暂不可用，请稍后重试。";
}

/** Observe only HTTP status. Never log or expose provider bodies or headers. */
export function observeModelFetch(
	fetcher: typeof fetch,
	failed: (code: string) => void,
): typeof fetch {
	return async (input: string | URL | Request, options?: RequestInit) => {
		const response = await fetcher(input, options);
		if (!response.ok) failed(modelFailureCode(String(response.status)));
		return response;
	};
}
