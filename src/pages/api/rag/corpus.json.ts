import { getCollection } from "astro:content";
import { selectPublicPosts } from "@/utils/blog-rag";
import { splitPost } from "@/utils/blog-rag-index";

export const prerender = true;

// Vercel bundles this snapshot; every included article is already public.
export async function GET() {
	return Response.json(
		selectPublicPosts(await getCollection("posts")).map((post) => ({
			id: post.id,
			body: post.body || "",
			chunks: splitPost({
				id: post.id,
				title: post.data.title,
				body: post.body || "",
			}),
		})),
	);
}
