import type { Metadata, MetadataRoute } from "next";
import type { LocalizedUrl, Story, SupportedLanguage } from "./types";

export const PRODUCTION_SITE_URL = "https://jhonattanbenitez.dev";
export const SEO_LOCALES = {
  en: { hreflang: "en", openGraph: "en_US", structuredData: "en" },
  "es-co": { hreflang: "es-CO", openGraph: "es_CO", structuredData: "es-CO" },
} as const;

export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.SITE_URL || env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL).replace(/\/$/, "");
}

export function absoluteUrl(pathname: string, baseUrl = getSiteUrl()): string {
  return `${baseUrl}${pathname === "/" ? "" : `/${pathname.replace(/^\/+/, "")}`}`;
}

export function deterministicLocalizedUrls(
  englishPath: string,
  spanishPath = `/es-co${englishPath === "/" ? "" : englishPath}`,
): LocalizedUrl[] {
  return [{ locale: "en", href: englishPath }, { locale: "es-co", href: spanishPath }];
}

export function metadataLanguages(urls: LocalizedUrl[]): Record<string, string> {
  const result = Object.fromEntries(urls.map(({ locale, href }) => [
    SEO_LOCALES[locale].hreflang,
    absoluteUrl(href),
  ]));
  const english = urls.find(({ locale }) => locale === "en");
  if (english) result["x-default"] = absoluteUrl(english.href);
  return result;
}

function imageUrl(story: Story | null): string {
  const image = story?.content.image;
  const first = Array.isArray(image) ? image[0] : image;
  return first?.filename || first?.source || absoluteUrl("/og-image.jpg");
}

export function generateMetadataFromStory(
  story: Story | null,
  locale: SupportedLanguage = "en",
  pathname = "/",
  localizedUrls: LocalizedUrl[] = [{ locale, href: pathname }],
): Metadata {
  const spanish = locale === "es-co";
  const title = story?.content.title || story?.name ||
    (spanish ? "Portafolio de Jhonattan Benitez" : "Jhonattan Benitez Portfolio");
  const description = story?.content.intro || (spanish
    ? "Desarrollador Frontend especializado en experiencias web modernas y accesibles."
    : "Frontend Developer specializing in modern, accessible web experiences.");
  const canonical = absoluteUrl(pathname);
  return {
    title,
    description,
    authors: [{ name: "Jhonattan Benitez" }],
    creator: "Jhonattan Benitez",
    publisher: "Jhonattan Benitez",
    robots: { index: true, follow: true },
    alternates: { canonical, languages: metadataLanguages(localizedUrls) },
    openGraph: {
      type: story?.content.component === "post" ? "article" : "website",
      url: canonical,
      locale: SEO_LOCALES[locale].openGraph,
      alternateLocale: localizedUrls
        .filter(({ locale: alternate }) => alternate !== locale)
        .map(({ locale: alternate }) => SEO_LOCALES[alternate].openGraph),
      title,
      description,
      siteName: "Jhonattan Benitez Portfolio",
      images: [{ url: imageUrl(story), width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl(story)] },
  };
}

export function generateStructuredData(
  story: Story | null,
  locale: SupportedLanguage,
  pathname: string,
) {
  const url = absoluteUrl(pathname);
  if (!story) return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Jhonattan Benitez",
    url,
    inLanguage: SEO_LOCALES[locale].structuredData,
  };
  return {
    "@context": "https://schema.org",
    "@type": story.content.component === "post" ? "BlogPosting" : "CreativeWork",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: story.content.title || story.name,
    description: story.content.intro,
    image: imageUrl(story),
    datePublished: story.first_published_at,
    dateModified: story.updated_at,
    inLanguage: SEO_LOCALES[locale].structuredData,
    author: { "@type": "Person", name: "Jhonattan Benitez" },
  };
}

export function buildSitemapEntries(
  pages: Array<{ url: LocalizedUrl; alternates?: LocalizedUrl[]; lastModified?: string }>,
): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return pages.flatMap(({ url, alternates, lastModified }) => {
    const absolute = absoluteUrl(url.href);
    if (seen.has(absolute) || /^\/es(?:\/|$)/.test(url.href)) return [];
    seen.add(absolute);
    return [{
      url: absolute,
      lastModified: lastModified || new Date().toISOString(),
      changeFrequency: "monthly" as const,
      priority: url.href === "/" ? 1 : 0.7,
      ...(alternates?.length ? { alternates: { languages: metadataLanguages(alternates) } } : {}),
    }];
  });
}

export function generateRobotsTxt(baseUrl: string) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n\nDisallow: /admin/\nDisallow: /preview/\nDisallow: /live-preview/\n`;
}
