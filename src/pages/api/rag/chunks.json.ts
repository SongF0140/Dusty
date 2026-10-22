import { getCollection } from "astro:content";
import { selectPublicPosts } from "@/utils/blog-rag";
import { buildRagIndex } from "@/utils/blog-rag-index";
import { getPostUrlBySlug } from "@/utils/url-utils";
export const prerender = true;
export async function GET() {
	const posts = selectPublicPosts(await getCollection("posts"));
	return Response.json(
		buildRagIndex(
			posts.map((post) => ({
				id: post.id,
				title: post.data.title,
				url: getPostUrlBySlug(post.id),
				description: post.data.description,
				body: post.body || "",
				tags: post.data.tags,
				category: post.data.category || "",
			})),
		),
	);
}
