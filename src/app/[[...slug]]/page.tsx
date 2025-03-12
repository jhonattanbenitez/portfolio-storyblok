import { StoryblokStory } from "@storyblok/react/rsc";
import { fetchStory } from "../../../utils/fetchStory";

export async function generateStaticParams() {
  // If you want to pre-generate specific pages, return their slugs here.
  // For dynamic pages, return an empty array.
  return [];
}

type Params = { slug?: string[] };

export default async function Page({ params }: { params: Params }) {
  const { slug } = params;

  // Determine if preview mode is enabled
  const isPreview = process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW === "true";

  // Fetch the story data
  const pageData = await fetchStory(isPreview ? "draft" : "published", slug);

  if (!pageData?.story) {
    return <p>Loading...</p>;
  }

  return <StoryblokStory story={pageData.story} />;
}
