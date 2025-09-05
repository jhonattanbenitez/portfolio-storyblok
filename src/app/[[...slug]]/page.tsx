import { StoryblokStory } from "@storyblok/react/rsc";
import { fetchStory } from "../../../utils/fetchStory";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug?: string[] }>;

export default async function Home({ params }: { params: Params }) {
  const slug = (await params).slug;
  const pageData = await fetchStory("published", slug);

  if (!pageData?.story) {
    notFound();
  }

  return <StoryblokStory story={pageData.story} />;
}
