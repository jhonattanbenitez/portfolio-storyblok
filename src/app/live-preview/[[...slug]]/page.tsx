import { StoryblokStory } from "@storyblok/react/rsc";
import { getStoryFromRoute } from "../../../../lib/storyblok-data";
import { getStoryblokApi } from "../../../../lib/storyblok";

getStoryblokApi(true);

type Params = Promise<{ slug?: string[] }>;

export default async function Home({ params }: Readonly<{ params: Params }>) {
  const slug = (await params).slug;
  const pageData = await getStoryFromRoute("draft", slug);

  if (!pageData?.story) {
    return <p>Loading...</p>; 
  }

  return <StoryblokStory story={pageData?.story} />;
}
