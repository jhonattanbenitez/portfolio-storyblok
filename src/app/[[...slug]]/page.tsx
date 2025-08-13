import { StoryblokStory } from "@storyblok/react/rsc";
import { fetchStory } from "../../../utils/fetchStory";

export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug?: string[] }>;

export default async function Home({ params }: { params: Params }) {
  const slug = (await params).slug;
  const pageData = await fetchStory("published", slug);

  if (!pageData?.story) {
    return <div>404 - Page not found</div>;
  }

  return <StoryblokStory story={pageData.story} />;
}
