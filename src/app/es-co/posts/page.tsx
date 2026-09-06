import PostsPageComponent from "../../../../components/PostsPageComponent";
import { getPosts } from "../../../../lib/storyblok-data";

export default async function PostsPageES() {
  const stories = await getPosts({ version: "published", locale: "es-co" });
  return <PostsPageComponent stories={stories} locale="es-co" />;
}
