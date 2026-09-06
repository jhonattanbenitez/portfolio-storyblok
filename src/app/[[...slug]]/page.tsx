import { StoryblokStory } from "@storyblok/react/rsc";
import {
  getAllStoryParams,
  getStoriesByUuids,
  getStoryBySlug,
  getStoryFromRoute,
  getPostContentLanguage,
  resolveCaseStudyStoriesForLocale,
  resolveLocalizedStoryUrls,
} from "../../../lib/storyblok-data";
import {
  deterministicLocalizedUrls,
  generateMetadataFromStory,
  generateStructuredData,
} from "../../../utils/seo";
import { notFound } from "next/navigation";
import {
  RouteParams,
  SupportedLanguage,
  StoryblokBlock,
} from "../../../utils/types";
import { Metadata } from "next";
import { draftMode } from "next/headers";
import { getStoryblokApi } from "../../../lib/storyblok";
import { AlternateLinksPublisher } from "../../../contexts/AlternateLinksContext";

export async function generateStaticParams() {
  const paths = await getAllStoryParams();
  return paths.filter(({ slug }) => {
    const routeSegments = slug[0] === "es-co" ? slug.slice(1) : slug;

    // Category URLs are owned by the explicit App Router category routes.
    return routeSegments[0] !== "categories";
  });
}

getStoryblokApi();

async function localizedUrlsForPage(
  story: NonNullable<Awaited<ReturnType<typeof getStoryFromRoute>>["story"]>,
  locale: SupportedLanguage,
  pathname: string,
  version: "draft" | "published",
) {
  const isPost = story.content.component === "post";
  const isDetail =
    (isPost && story.content.language === getPostContentLanguage(locale)) ||
    story.content.component === "case_study";
  if (isDetail) {
    return resolveLocalizedStoryUrls({ story, currentLocale: locale, version });
  }
  if (["/", "/es-co", "/posts", "/es-co/posts", "/case-studies", "/es-co/case-studies"].includes(pathname)) {
    const englishPath = pathname.replace(/^\/es-co(?=\/|$)/, "") || "/";
    return deterministicLocalizedUrls(englishPath);
  }
  return [{ locale, href: pathname }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const language: SupportedLanguage = slug?.[0] === "es-co" ? "es-co" : "en";
  const pathname = slug ? `/${slug.join("/")}` : "/";
  try {
    const { isEnabled } = await draftMode();
    const isDev = process.env.NODE_ENV === "development";
    const version = isEnabled || isDev ? "draft" : "published";

    // Fetch story data for metadata
    let fetchSlug = slug;
    const slugPath = slug ? slug.join("/") : "";
    if (slugPath === "case-studies" || slugPath === "es-co/case-studies") {
      fetchSlug = [...(slug || []), "home"];
    }

    const pageData = await getStoryFromRoute(version, fetchSlug);
    const story = pageData?.story || null;

    const localizedUrls = story
      ? await localizedUrlsForPage(story, language, pathname, version)
      : [{ locale: language, href: pathname }];
    return generateMetadataFromStory(story, language, pathname, localizedUrls);
  } catch (error) {
    console.error("Error generating metadata:", error);

    // Return default metadata on error
    return generateMetadataFromStory(null, language, pathname);
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

    const locale: SupportedLanguage = slug?.[0] === "es-co" ? "es-co" : "en";
    const pathname = slug ? `/${slug.join("/")}` : "/";
    const localizedUrls = await localizedUrlsForPage(pageData.story, locale, pathname, version);

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
      <>
        <AlternateLinksPublisher urls={localizedUrls} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateStructuredData(pageData.story, locale, pathname)),
          }}
        />
        <StoryblokStory story={pageData.story} />
      </>
    );
  } catch (error) {
    console.error("Error in page component:", error);
    notFound();
  }
}
