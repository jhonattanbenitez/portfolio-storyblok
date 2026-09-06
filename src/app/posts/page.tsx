import PostsPageComponent from "../../../components/PostsPageComponent";
import { getPosts } from "../../../lib/storyblok-data";
import { deterministicLocalizedUrls, generateMetadataFromStory } from "../../../utils/seo";
import { renderStoryIntros } from "../../../utils/markdown";

export const metadata = generateMetadataFromStory(null, "en", "/posts", deterministicLocalizedUrls("/posts"));

export default async function PostsPage() {
  const stories = await renderStoryIntros(
    await getPosts({ version: "published", locale: "en" }),
  );
  return <PostsPageComponent stories={stories} locale="en" />;
}
