import { StoryblokStory, StoryblokServerComponent } from "@storyblok/react/rsc";
import {
  getStoryFromRoute,
  getStoryblokVersion,
  isStoryblokNotFound,
} from "../../../lib/storyblok-data";
import { generateMetadataFromStory } from "../../../utils/seo";
import { notFound, unstable_rethrow } from "next/navigation";
import { Metadata } from "next";
import { getAuthorizedDraftMode } from "../../../lib/draft-session";
import { getStoryblokApi } from "../../../lib/storyblok";
import { StoryblokDataError } from "../../../lib/storyblok-data";

getStoryblokApi();

export async function generateMetadata(): Promise<Metadata> {
  const { isEnabled } = await getAuthorizedDraftMode();
  const version = getStoryblokVersion(isEnabled);

  try {
    const pageData = await getStoryFromRoute(version, ["landing"]);
    const story = pageData?.story;
    if (!story) throw new StoryblokDataError("Invalid Storyblok story response", "INVALID_RESPONSE");
    return generateMetadataFromStory(story, "en", "/landing", undefined, isEnabled);
  } catch (error) {
    unstable_rethrow(error);
    if (isStoryblokNotFound(error)) notFound();
    throw error;
  }
}

export default async function LandingPage() {
  const { isEnabled } = await getAuthorizedDraftMode();
  const version = getStoryblokVersion(isEnabled);
  let pageData: Awaited<ReturnType<typeof getStoryFromRoute>>;

  try {
    pageData = await getStoryFromRoute(version, ["landing"]);

    if (!pageData?.story) {
      throw new StoryblokDataError("Invalid Storyblok story response", "INVALID_RESPONSE");
    }

  } catch (error) {
    unstable_rethrow(error);
    if (isStoryblokNotFound(error)) notFound();
    throw error;
  }
  return isEnabled
    ? <StoryblokStory story={pageData.story} alternates={pageData.story.alternates} />
    : <StoryblokServerComponent blok={pageData.story.content} />;
}
