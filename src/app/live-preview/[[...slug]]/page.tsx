import { StoryblokStory } from "@storyblok/react/rsc";
import { getStoryFromRoute } from "../../../../lib/storyblok-data";
import { getStoryblokApi } from "../../../../lib/storyblok";
import { getAuthorizedDraftMode } from "../../../../lib/draft-session";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isStoryblokNotFound, isStoryblokInvalidRequest } from "../../../../lib/storyblok-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Params = Promise<{ slug?: string[] }>;

export default async function Home({ params }: Readonly<{ params: Params }>) {
  // Check the framework-validated cookie before initializing or requesting drafts.
  if (!(await getAuthorizedDraftMode()).isEnabled) notFound();
  if (!process.env.STORYBLOK_PREVIEW_TOKEN) {
    throw new Error("Preview is not configured");
  }
  getStoryblokApi(true);
  const slug = (await params).slug;
  let pageData: Awaited<ReturnType<typeof getStoryFromRoute>>;
  try {
    pageData = await getStoryFromRoute("draft", slug);
    if (!pageData?.story) notFound();
  } catch (error) {
    if (isStoryblokNotFound(error) || isStoryblokInvalidRequest(error)) notFound();
    throw error;
  }
  return <StoryblokStory story={pageData.story} />;
}
