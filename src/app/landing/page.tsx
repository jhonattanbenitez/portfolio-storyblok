import { StoryblokStory, StoryblokServerComponent } from "@storyblok/react/rsc";
import {
  getStoryFromRoute,
  getStoryblokVersion,
  isStoryblokNotFound,
} from "../../../lib/storyblok-data";
import { generateMetadataFromStory } from "../../../utils/seo";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAuthorizedDraftMode } from "../../../lib/draft-session";
import { getStoryblokApi } from "../../../lib/storyblok";

getStoryblokApi();

export async function generateMetadata(): Promise<Metadata> {
  const { isEnabled } = await getAuthorizedDraftMode();
  const version = getStoryblokVersion(isEnabled);

  try {
    const pageData = await getStoryFromRoute(version, ["landing"]);
    const story = pageData?.story || null;
    return generateMetadataFromStory(story, "en", "/landing", undefined, isEnabled);
  } catch {
    return generateMetadataFromStory(null, "en", "/landing", undefined, isEnabled);
  }
}

export default async function LandingPage() {
  const { isEnabled } = await getAuthorizedDraftMode();
  const version = getStoryblokVersion(isEnabled);
  let pageData: Awaited<ReturnType<typeof getStoryFromRoute>>;

  try {
    pageData = await getStoryFromRoute(version, ["landing"]);

    if (!pageData?.story) {
      notFound();
    }

  } catch (error) {
    console.error("Error in landing page:", error);
    if (isStoryblokNotFound(error)) notFound();
    throw error;
  }
  return isEnabled
    ? <StoryblokStory story={pageData.story} alternates={pageData.story.alternates} />
    : <StoryblokServerComponent blok={pageData.story.content} />;
}
