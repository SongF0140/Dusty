import { getCollection } from "astro:content";
import { selectPublicPosts } from "@/utils/blog-rag";
import { buildRagIndex } from "@/utils/blog-rag-index";
import { getPostUrlBySlug, removeFileExtension, url } from "@/utils/url-utils";

export const prerender = true;

export async function GET() {
	const posts = selectPublicPosts(await getCollection("posts"));
	const index = buildRagIndex(
		posts.map((post) => ({
			id: post.id,
			title: post.data.title,
			url: getPostUrlBySlug(post.id),
			body: post.body || "",
			description: post.data.description,
			tags: post.data.tags,
			category: post.data.category || "",
		})),
	);
	const articles = posts.map((post) => ({
		id: post.id,
		title: post.data.title,
		url: getPostUrlBySlug(post.id),
		bodyUrl: url(
			`/api/terminal-posts/${removeFileExtension(post.id)}/index.json`,
		),
		description: post.data.description,
		tags: post.data.tags,
		category: post.data.category || "",
		published: post.data.published.toISOString(),
		updated: post.data.updated?.toISOString() ?? null,
		revision: index.documents.find((item) => item.id === post.id)?.revision,
		chunkCount:
			index.documents.find((item) => item.id === post.id)?.chunks.length ?? 0,
	}));
	return Response.json(articles);
}
