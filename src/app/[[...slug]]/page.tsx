import { StoryblokStory } from "@storyblok/react/rsc";
import {
  getAllStoryParams,
  getStoriesByUuids,
  getStoryBySlug,
  getStoryFromRoute,
  resolveCaseStudyStoriesForLocale,
} from "../../../lib/storyblok-data";
import { generateMetadataFromStory } from "../../../utils/seo";
import { notFound } from "next/navigation";
import {
  RouteParams,
  SupportedLanguage,
  StoryblokBlock,
} from "../../../utils/types";
import { Metadata } from "next";
import { draftMode } from "next/headers";
import { getStoryblokApi } from "../../../lib/storyblok";

export async function generateStaticParams() {
  const paths = await getAllStoryParams();
  return paths.filter(({ slug }) => {
    const routeSegments = slug[0] === "es-co" ? slug.slice(1) : slug;

    // Category URLs are owned by the explicit App Router category routes.
    return routeSegments[0] !== "categories";
  });
}

getStoryblokApi();

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
      if (slug[0] === "es-co") {
        language = "es-co";
      }
    }

    // Fetch story data for metadata
    let fetchSlug = slug;
    const slugPath = slug ? slug.join("/") : "";
    if (slugPath === "case-studies" || slugPath === "es-co/case-studies") {
      fetchSlug = [...(slug || []), "home"];
    }

    const pageData = await getStoryFromRoute(version, fetchSlug);
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

    const pageData = await getStoryFromRoute(
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
        const language = slug && slug[0] === "es-co" ? "es-co" : "en";
        const referencedStories = await getStoriesByUuids({
          version,
          uuids: section.case_studies as string[],
          locale: language,
        });
        section.case_studies = await resolveCaseStudyStoriesForLocale({
          stories: referencedStories,
          locale: language,
          version,
          fetchAlternate: async (fullSlug, locale, alternateVersion) => {
            const alternateData = await getStoryBySlug({
              version: alternateVersion,
              slug: fullSlug,
              locale,
            });
            return alternateData?.story ?? null;
          },
        });
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
