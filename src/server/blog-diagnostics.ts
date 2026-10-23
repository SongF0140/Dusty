/** Safe, finite diagnostic codes; never expose provider response text. */
export function modelFailureCode(message: string): string {
	const status = /^(?:Error:\s*)?(?:HTTP\s*)?([45]\d\d)\b/i.exec(
		message.trim(),
	)?.[1];
	if (
		/quota[_ -]?expired|expired.{0,30}quota|quota.{0,30}expir|配额.{0,12}(过期|失效)|额度.{0,12}(过期|失效)/i.test(
			message,
		)
	)
		return "quota_expired";
	if (
		/insufficient[_ -](balance|credit)|balance.{0,20}(insufficient|exhaust|zero)|余额不足|墨点不足/i.test(
			message,
		)
	)
		return "insufficient_balance";
	if (
		/insufficient_quota|quota[_ -]exceeded|quota.{0,20}exhaust/i.test(message)
	)
		return "quota_exhausted";
	if (
		/rate[_ .-]?limit|\b[RT]PM\b|请求.{0,8}频繁|限流/i.test(message) ||
		status === "429"
	)
		return "rate_limit";
	if (/max_completion_tokens|max_tokens/i.test(message))
		return "unsupported_max_tokens";
	if (/tool_choice|tools.*support|function.*support/i.test(message))
		return "unsupported_tools";
	if (/store.*support|unsupported.*store/i.test(message))
		return "unsupported_store";
	if (
		["401", "403"].includes(status || "") ||
		/invalid.*key|unauthoriz/i.test(message)
	)
		return "authentication";
	if (/\bquota\b/i.test(message)) return "quota_or_rate_limit";
	if (/timed?\s*out|timeout|aborted/i.test(message)) return "timeout";
	if (status === "404" || /model.*not.found|model.*not.exist/i.test(message))
		return "model_or_endpoint";
	if (["400", "422"].includes(status || "") || /bad.request/i.test(message))
		return "invalid_request";
	if (["500", "502", "503", "504"].includes(status || ""))
		return "upstream_unavailable";
	return "unknown";
}

export function modelFailureMessage(code: string): string {
	if (code === "quota_expired")
		return "模型服务账户配额已过期或失效，请在供应商控制台检查额度有效期并重新开通或领取；博客每天20次的配额仍然独立计算。";
	if (code === "insufficient_balance")
		return "模型服务账户余额或墨点不足，请在供应商控制台检查余额。";
	if (code === "quota_exhausted")
		return "模型服务账户配额已用完，请检查账户或 Key 的使用上限。";
	if (code === "rate_limit")
		return "模型服务触发请求或 Token 限流，请稍后再试；同一供应商账户的其他应用也可能占用限额。";
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

/** Classify a bounded error body internally; expose only finite codes and HTTP status. */
export function observeModelFetch(
	fetcher: typeof fetch,
	failed: (code: string, status?: number) => void,
): typeof fetch {
	return async (input: string | URL | Request, options?: RequestInit) => {
		const response = await fetcher(input, options);
		if (!response.ok) {
			const reader = response.clone().body?.getReader();
			let text = "";
			let bytes = 0;
			const decoder = new TextDecoder();
			try {
				while (reader && bytes < 8192) {
					const chunk = await reader.read();
					if (chunk.done) break;
					const part = chunk.value.subarray(0, 8192 - bytes);
					bytes += part.length;
					text += decoder.decode(part, { stream: true });
				}
				text += decoder.decode();
			} catch {
				/* Status alone remains usable. */
			} finally {
				void reader?.cancel().catch(() => undefined);
			}
			failed(modelFailureCode(`${response.status} ${text}`), response.status);
		}
		return response;
	};
}
