import { StoryblokStory, StoryblokServerComponent } from "@storyblok/react/rsc";
import {
  getAllStoryParams,
  getStoriesByUuids,
  getStoryBySlug,
  getStoryFromRoute,
  getPostContentLanguage,
  getStoryblokVersion,
  isStoryblokNotFound,
  isStoryblokInvalidRequest,
  resolveCaseStudyStoriesForLocale,
  resolveLocalizedStoryUrls,
  resolveStoryRouteRedirect,
} from "../../../lib/storyblok-data";
import {
  deterministicLocalizedUrls,
  generateMetadataFromStory,
  generateRedirectMetadata,
  generateStructuredData,
  serializeJsonLd,
} from "../../../utils/seo";
import { notFound, permanentRedirect, unstable_rethrow } from "next/navigation";
import {
  RouteParams,
  SupportedLanguage,
  StoryblokBlock,
} from "../../../utils/types";
import { Metadata } from "next";
import { getAuthorizedDraftMode } from "../../../lib/draft-session";
import { getStoryblokApi } from "../../../lib/storyblok";
import { AlternateLinksPublisher } from "../../../contexts/AlternateLinksContext";
import HomeV2 from "../../../components/HomeV2/HomeV2";
import { isHomeV2Path } from "../../../lib/home-v2";

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
  // A validated editorial projection owns the URLs for both field and legacy
  // variants. Its Spanish representation can retain the English story identity.
  if (story.editorial) return story.editorial.localizedUrls;
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
  const { isEnabled } = await getAuthorizedDraftMode();
  try {
    const version = getStoryblokVersion(isEnabled);

    // Fetch story data for metadata
    let fetchSlug = slug;
    const slugPath = slug ? slug.join("/") : "";
    if (slugPath === "case-studies" || slugPath === "es-co/case-studies") {
      fetchSlug = [...(slug || []), "home"];
    }

    const pageData = await getStoryFromRoute(version, fetchSlug);
    const story = pageData?.story || null;
    const redirectHref = story && await resolveStoryRouteRedirect({ story, locale: language, version });
    if (redirectHref) return generateRedirectMetadata(redirectHref);

    const localizedUrls = story
      ? await localizedUrlsForPage(story, language, pathname, version)
      : [{ locale: language, href: pathname }];
    return generateMetadataFromStory(story, language, pathname, localizedUrls, isEnabled);
  } catch (error) {
    unstable_rethrow(error);
    if (isStoryblokInvalidRequest(error)) notFound();
    console.error("Error generating metadata:", error);

    // Return default metadata on error
    return generateMetadataFromStory(null, language, pathname, undefined, isEnabled);
  }
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let prepared: {
    pageData: Awaited<ReturnType<typeof getStoryFromRoute>>;
    localizedUrls: Awaited<ReturnType<typeof localizedUrlsForPage>>;
    isEnabled: boolean;
    structuredData: string;
    locale: SupportedLanguage;
    pathname: string;
  };
  try {
    const { slug } = await params;
    const { isEnabled } = await getAuthorizedDraftMode();
    const version = getStoryblokVersion(isEnabled);

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
    const redirectHref = await resolveStoryRouteRedirect({
      story: pageData.story, locale, version, searchParams: await searchParams,
    });
    if (redirectHref) permanentRedirect(redirectHref);
    const localizedUrls = await localizedUrlsForPage(pageData.story, locale, pathname, version);

    // Home V2 resolves its original published case references once, at its own
    // server boundary. The legacy renderer still needs the mutation below.
    if ((!isHomeV2Path(pathname) || isEnabled) && pageData?.story?.content?.body) {
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

    prepared = {
      pageData, localizedUrls, isEnabled, locale, pathname,
      structuredData: serializeJsonLd(generateStructuredData(pageData.story, locale, pathname)),
    };
  } catch (error) {
    unstable_rethrow(error);
    if (isStoryblokNotFound(error) || isStoryblokInvalidRequest(error)) notFound();
    console.error("Error in page component:", error);
    throw error;
  }
  const { pageData, localizedUrls, isEnabled, structuredData, locale, pathname } = prepared;
  return (
    <>
      <AlternateLinksPublisher urls={localizedUrls} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      {!isEnabled && isHomeV2Path(pathname)
        ? <HomeV2 story={pageData.story} locale={locale} />
        : isEnabled
        ? <StoryblokStory story={pageData.story} />
        : <StoryblokServerComponent blok={pageData.story.content} />}
    </>
  );
}
