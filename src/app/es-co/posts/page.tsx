import PostsPageComponent from "../../../../components/PostsPageComponent";
import { fetchPosts } from "../../../../utils/fetchStories";

export default async function PostsPageES() {
  const stories = await fetchPosts({ version: "published", locale: "es-co" });
  return <PostsPageComponent stories={stories} locale="es-co" />;
}
