import PostsPageComponent from "../../../components/PostsPageComponent";
import { fetchPosts } from "../../../utils/fetchStories";

export default async function PostsPage() {
  const stories = await fetchPosts({ version: "published", locale: "en" });
  return <PostsPageComponent stories={stories} locale="en" />;
}
