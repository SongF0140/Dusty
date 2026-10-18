export function githubCommentTerm(path: string) {
	let normalized = path.split(/[?#]/)[0];
	try { normalized = decodeURIComponent(normalized); } catch { /* Preserve invalid encoding. */ }
	return normalized.replace(/\/+$/, "") || "/";
}

export function isGithubCommentsConfigured(config?: { repo: string; repoId: string; categoryId: string }) {
	return Boolean(config && /^[\w.-]+\/[\w.-]+$/.test(config.repo) && config.repoId.startsWith("R_") && config.categoryId.startsWith("DIC_"));
}
