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
