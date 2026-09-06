export function getCaseStudyHref(fullSlug: string): string {
  return fullSlug.startsWith("/") ? fullSlug : `/${fullSlug}`;
}

import type { LocalizedUrl, SupportedLanguage } from "./types";

export function normalizeStoryFullSlug(fullSlug: string): string {
  return fullSlug.replace(/^\/+/, "").replace(/^(?:en|es-co)\//, "");
}

export function buildLocalizedStoryHref(
  fullSlug: string,
  locale: SupportedLanguage,
): string {
  const path = normalizeStoryFullSlug(fullSlug);
  return locale === "es-co" ? `/es-co/${path}` : `/${path}`;
}

export function findLocalizedHref(
  urls: LocalizedUrl[],
  locale: SupportedLanguage,
): string | undefined {
  return urls.find((url) => url.locale === locale)?.href;
}

export function appendQueryString(href: string, queryString: string): string {
  return queryString ? `${href}?${queryString}` : href;
}

export function switchPathLocale(
  pathname: string,
  locale: SupportedLanguage,
): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "es-co") segments.shift();
  if (locale === "es-co") segments.unshift("es-co");
  return `/${segments.join("/")}`;
}
