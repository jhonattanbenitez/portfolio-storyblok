import { StoryblokStory } from "@storyblok/react/rsc";
import { getStoryFromRoute } from "../../../lib/storyblok-data";
import { generateMetadataFromStory } from "../../../utils/seo";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { draftMode } from "next/headers";
import { getStoryblokApi } from "../../../lib/storyblok";

getStoryblokApi();

export async function generateMetadata(): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const isDev = process.env.NODE_ENV === "development";
  const version = isEnabled || isDev ? "draft" : "published";

  try {
    const pageData = await getStoryFromRoute(version, ["landing"]);
    const story = pageData?.story || null;
    return generateMetadataFromStory(story, "en", "/landing");
  } catch (error) {
    return generateMetadataFromStory(null, "en", "/landing");
  }
}

export default async function LandingPage() {
  const { isEnabled } = await draftMode();
  const isDev = process.env.NODE_ENV === "development";
  const version = isEnabled || isDev ? "draft" : "published";

  try {
    const pageData = await getStoryFromRoute(version, ["landing"]);

    if (!pageData?.story) {
      notFound();
    }

    return (
      <StoryblokStory
        story={pageData.story}
        alternates={pageData.story.alternates}
      />
    );
  } catch (error) {
    console.error("Error in landing page:", error);
    notFound();
  }
}
