import PostsPageComponent from "../../../components/PostsPageComponent";
import { getPosts } from "../../../lib/storyblok-data";

export default async function PostsPage() {
  const stories = await getPosts({ version: "published", locale: "en" });
  return <PostsPageComponent stories={stories} locale="en" />;
}
