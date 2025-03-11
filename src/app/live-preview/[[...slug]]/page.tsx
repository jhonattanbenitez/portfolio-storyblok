import { StoryblokStory } from "@storyblok/react/rsc";
import { fetchStory } from "../../../../utils/fetchStory";

type Params = Promise<{ slug?: string[] }>;

export default async function Home({ params }: { params: Params }) {
  const slug = (await params).slug;
  const pageData = await fetchStory("draft", slug);

  if (!pageData?.story) {
    return <p>Loading...</p>; 
  }

  return <StoryblokStory story={pageData?.story} />;
}
