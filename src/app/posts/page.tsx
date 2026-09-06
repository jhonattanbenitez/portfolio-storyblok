import PostsPageComponent from "../../../components/PostsPageComponent";
import { getPosts } from "../../../lib/storyblok-data";
import { deterministicLocalizedUrls, generateMetadataFromStory } from "../../../utils/seo";

export const metadata = generateMetadataFromStory(null, "en", "/posts", deterministicLocalizedUrls("/posts"));

export default async function PostsPage() {
  const stories = await getPosts({ version: "published", locale: "en" });
  return <PostsPageComponent stories={stories} locale="en" />;
}
