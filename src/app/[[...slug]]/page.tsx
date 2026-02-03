import { StoryblokStory } from "@storyblok/react/rsc";
import { fetchStory, fetchStoriesByUuids } from "../../../utils/fetchStory";
import { generateMetadataFromStory } from "../../../utils/seo";
import { notFound } from "next/navigation";
import {
  RouteParams,
  SupportedLanguage,
  StoryblokBlock,
} from "../../../utils/types";
import { Metadata } from "next";
import { draftMode } from "next/headers";

export async function generateStaticParams() {
  // Generate static params for known routes
  return [
    { slug: [] },
    { slug: ["posts"] },
    { slug: ["contact"] },
    { slug: ["es-co"] },
    { slug: ["es-co", "posts"] },
    { slug: ["es-co", "contact"] },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { isEnabled } = await draftMode();
    const isDev = process.env.NODE_ENV === "development";
    const version = isEnabled || isDev ? "draft" : "published";

    // Determine language from slug
    let language: SupportedLanguage = "en";
    if (slug && slug.length > 0) {
      if (slug[0] === "es-co" || slug[0] === "es") {
        language = slug[0] === "es" ? "es-co" : slug[0];
      }
    }

    // Fetch story data for metadata
    let fetchSlug = slug;
    const slugPath = slug ? slug.join("/") : "";
    if (slugPath === "case-studies" || slugPath === "es-co/case-studies") {
      fetchSlug = [...(slug || []), "home"];
    }

    const pageData = await fetchStory(version, fetchSlug);
    const story = pageData?.story || null;

    // Generate pathname for canonical URL
    const pathname = slug ? `/${slug.join("/")}` : "/";

    return generateMetadataFromStory(story, language, pathname);
  } catch (error) {
    console.error("Error generating metadata:", error);

    // Return default metadata on error
    return generateMetadataFromStory(null, "en", "/");
  }
}

export default async function Home({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  try {
    const { slug } = await params;
    const { isEnabled } = await draftMode();
    const isDev = process.env.NODE_ENV === "development";
    const version = isEnabled || isDev ? "draft" : "published";

    // Map folder root to 'home' story
    let fetchSlug = slug;
    const slugPath = slug ? slug.join("/") : "";
    if (slugPath === "case-studies" || slugPath === "es-co/case-studies") {
      fetchSlug = [...(slug || []), "home"];
    }

    const pageData = await fetchStory(
      version,
      fetchSlug,
      "case_studies_section.case_studies",
    );

    if (pageData?.story?.content?.body) {
      const section = pageData.story.content.body.find(
        (b: StoryblokBlock) => b.component === "case_studies_section",
      );

      if (
        section?.case_studies &&
        Array.isArray(section.case_studies) &&
        section.case_studies.length > 0 &&
        typeof section.case_studies[0] === "string"
      ) {
        // Fallback: Fetch stories manually if they are not resolved
        const resolvedStories = await fetchStoriesByUuids(
          version,
          section.case_studies as string[],
          slug && slug[0] === "es" ? "es-co" : "en", // Simple language detection
        );
        section.case_studies = resolvedStories;
      }
    }

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
    console.error("Error in page component:", error);
    notFound();
  }
}
