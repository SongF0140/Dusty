import { getSortedPosts } from "@/utils/content-utils";
import { removeFileExtension } from "@/utils/url-utils";

export async function getStaticPaths() {
	const posts = await getSortedPosts();
	return posts.filter(post => !post.data.password).map(post => ({
		params: { slug: removeFileExtension(post.id) },
		props: { body: post.body || "" },
	}));
}

export function GET({ props }: { props: { body: string } }) {
	return new Response(JSON.stringify({ body: props.body }), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
