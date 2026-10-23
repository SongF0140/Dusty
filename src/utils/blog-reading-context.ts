export function refersToArticle(question: string) {
	return /这(?:一)?篇|那(?:一)?篇|(?:这|那)(?:个)?(?:文章|博文)|本文|本篇|当前(?:的)?(?:文章|博文)|这个判断|核心观点|结论的边界|(?:总结|解析|解读|分析|梳理|读读|讲讲|看看)(?:一下|下)?(?:文章|博文)/.test(
		question,
	);
}

export function needsArticleClarification(
	question: string,
	articleIds: readonly string[],
	posts: readonly { id: string; title: string; url: string }[],
) {
	if (articleIds.length || !refersToArticle(question)) return false;
	const text = question.toLowerCase();
	return !posts.some(
		(post) =>
			(post.title && text.includes(post.title.toLowerCase())) ||
			(post.url && text.includes(post.url.toLowerCase())),
	);
}

export const ARTICLE_READING_INVITATION =
	"不急，我们先找好要读的那一页。点进你想看的博文再来找我，或把文章标题告诉我；有了方向，我就陪你慢慢往下读。";
