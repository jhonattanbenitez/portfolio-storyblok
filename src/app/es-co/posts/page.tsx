import PostsPageComponent from "../../../../components/PostsPageComponent";
import { getPosts } from "../../../../lib/storyblok-data";
import { deterministicLocalizedUrls, generateMetadataFromStory } from "../../../../utils/seo";

export const metadata = generateMetadataFromStory(null, "es-co", "/es-co/posts", deterministicLocalizedUrls("/posts"));

export default async function PostsPageES() {
  const stories = await getPosts({ version: "published", locale: "es-co" });
  return <PostsPageComponent stories={stories} locale="es-co" />;
}
