import type {
  StoriesResponse,
  Story,
  StoryblokApiResponse,
  SupportedLanguage,
} from "../utils/types";

export type StoryblokVersion = "draft" | "published";
export type PostContentLanguage = "english" | "spanish";

const API_URL = "https://api-us.storyblok.com/v2/cdn";
const PUBLISHED_REVALIDATE_SECONDS = 3600;
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000;

export class StoryblokDataError extends Error {
  readonly code: "MISSING_TOKEN" | "REQUEST_FAILED" | "INVALID_RESPONSE";
  readonly status?: number;

  constructor(
    message: string,
    code: "MISSING_TOKEN" | "REQUEST_FAILED" | "INVALID_RESPONSE",
    status?: number,
  ) {
    super(message);
    this.name = "StoryblokDataError";
    this.code = code;
    this.status = status;
  }
}

export function getStoryblokToken(
  version: StoryblokVersion,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const token = version === "draft"
    ? env.STORYBLOK_PREVIEW_TOKEN || env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN
    : env.STORYBLOK_TOKEN || env.NEXT_PUBLIC_STORYBLOK_TOKEN;

  if (!token) {
    throw new StoryblokDataError(
      `Storyblok ${version} API token is missing`,
      "MISSING_TOKEN",
    );
  }

  return token;
}

export function getStoryblokFetchOptions(
  version: StoryblokVersion,
  tags: string[],
): RequestInit & { next?: { revalidate?: number; tags: string[] } } {
  if (version === "draft") return { cache: "no-store" };

  return {
    cache: "force-cache",
    next: { revalidate: PUBLISHED_REVALIDATE_SECONDS, tags: ["cms", ...tags] },
  };
}

type RequestOptions = {
  version: StoryblokVersion;
  params?: Record<string, string | number | undefined>;
  tags?: string[];
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
};

export async function requestStoryblok<T>(
  endpoint: string,
  {
    version,
    params = {},
    tags = [],
    fetchImpl = fetch,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    random = Math.random,
  }: RequestOptions,
): Promise<T> {
  const searchParams = new URLSearchParams({
    token: getStoryblokToken(version),
    version,
  });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }

  const url = `${API_URL}/${endpoint.replace(/^\//, "")}?${searchParams}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(url, getStoryblokFetchOptions(version, tags));
      if (response.ok) return (await response.json()) as T;

      if (response.status !== 429 && response.status < 500) {
        throw new StoryblokDataError(
          `Storyblok request failed: ${response.status} ${response.statusText}`,
          "REQUEST_FAILED",
          response.status,
        );
      }

      lastError = new StoryblokDataError(
        `Storyblok request failed: ${response.status} ${response.statusText}`,
        "REQUEST_FAILED",
        response.status,
      );
    } catch (error) {
      if (error instanceof StoryblokDataError && error.status && error.status < 500 && error.status !== 429) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      const jitter = Math.round(random() * BASE_RETRY_DELAY_MS);
      await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt + jitter);
    }
  }

  if (lastError instanceof StoryblokDataError) throw lastError;
  throw new StoryblokDataError(
    `Storyblok request failed after ${MAX_ATTEMPTS} attempts`,
    "REQUEST_FAILED",
  );
}

export function parseSlugAndLocale(slug?: string[]): {
  locale: SupportedLanguage;
  storySlug: string;
} {
  if (slug?.[0] === "es-co") {
    return { locale: "es-co", storySlug: slug.slice(1).join("/") || "home" };
  }
  return { locale: "en", storySlug: slug?.join("/") || "home" };
}

export async function getStoryBySlug({
  slug,
  version,
  locale = "en",
  resolveRelations,
}: {
  slug: string;
  version: StoryblokVersion;
  locale?: SupportedLanguage;
  resolveRelations?: string;
}): Promise<StoryblokApiResponse> {
  return requestStoryblok<StoryblokApiResponse>(`stories/${slug}`, {
    version,
    params: { language: locale, resolve_relations: resolveRelations },
    tags: [`cms:${locale}`, `story:${slug}`],
  });
}

export async function getStoryFromRoute(
  version: StoryblokVersion,
  slug?: string[],
  resolveRelations?: string,
): Promise<StoryblokApiResponse> {
  const { locale, storySlug } = parseSlugAndLocale(slug);
  return getStoryBySlug({ slug: storySlug, version, locale, resolveRelations });
}

export interface GetStoriesOptions {
  version: StoryblokVersion;
  locale?: SupportedLanguage;
  startsWith?: string;
  perPage?: number;
  page?: number;
  categorySlug?: string;
  contentLanguage?: PostContentLanguage;
}

export function getPostContentLanguage(locale: SupportedLanguage): PostContentLanguage {
  return locale === "es-co" ? "spanish" : "english";
}

export function filterPostsForLocale(stories: Story[], locale: SupportedLanguage): Story[] {
  const contentLanguage = getPostContentLanguage(locale);
  return stories.filter((story) => story.content.language === contentLanguage);
}

export function buildStoriesSearchParams({
  locale = "en",
  startsWith = "posts/",
  perPage = 25,
  page,
  categorySlug,
  contentLanguage,
}: GetStoriesOptions): Record<string, string | number | undefined> {
  return {
    language: locale,
    starts_with: startsWith,
    per_page: perPage,
    page,
    fallback_lang: "false",
    "filter_query[category_ref.cached_url][in]": categorySlug
      ? `categories/${categorySlug}`
      : undefined,
    "filter_query[language][in]": contentLanguage,
  };
}

export async function getStories(options: GetStoriesOptions): Promise<StoriesResponse> {
  const locale = options.locale ?? "en";
  return requestStoryblok<StoriesResponse>("stories", {
    version: options.version,
    params: buildStoriesSearchParams(options),
    tags: [`cms:${locale}`, "cms:stories"],
  });
}

export async function getPosts({
  version,
  locale,
  categorySlug,
}: {
  version: StoryblokVersion;
  locale: SupportedLanguage;
  categorySlug?: string;
}): Promise<Story[]> {
  const response = await getStories({
    version,
    locale,
    startsWith: "posts/",
    perPage: 100,
    categorySlug,
    contentLanguage: getPostContentLanguage(locale),
  });
  return filterPostsForLocale(response.stories, locale);
}

export async function getStoriesByUuids({
  uuids,
  version,
  locale = "en",
}: {
  uuids: string[];
  version: StoryblokVersion;
  locale?: SupportedLanguage;
}): Promise<Story[]> {
  if (!uuids.length) return [];
  const response = await requestStoryblok<StoriesResponse>("stories", {
    version,
    params: { by_uuids: uuids.join(","), language: locale, per_page: 100 },
    tags: [`cms:${locale}`, "cms:stories"],
  });
  return response.stories;
}

export async function resolveAlternateStory({
  story,
  locale,
  version,
  fetchAlternate = async (fullSlug, targetLocale, targetVersion) =>
    (await getStoryBySlug({ slug: fullSlug, locale: targetLocale, version: targetVersion })).story,
  onWarning = console.warn,
}: {
  story: Story;
  locale: SupportedLanguage;
  version: StoryblokVersion;
  fetchAlternate?: (
    fullSlug: string,
    locale: SupportedLanguage,
    version: StoryblokVersion,
  ) => Promise<Story | null>;
  onWarning?: (message: string) => void;
}): Promise<Story | null> {
  if (story.alternates.length !== 1) {
    onWarning(`Cannot localize story ${story.uuid}: expected one alternate, found ${story.alternates.length}.`);
    return null;
  }
  const [reference] = story.alternates;
  if (!reference.published) {
    onWarning(`Cannot localize story ${story.uuid}: alternate is unpublished.`);
    return null;
  }

  try {
    const alternate = await fetchAlternate(reference.full_slug, locale, version);
    if (!alternate) {
      onWarning(`Cannot localize story ${story.uuid}: alternate was not found.`);
      return null;
    }
    if (alternate.id !== reference.id) {
      onWarning(`Cannot localize story ${story.uuid}: alternate ID did not match.`);
      return null;
    }
    if (alternate.group_id !== story.group_id) {
      onWarning(`Cannot localize story ${story.uuid}: group_id did not match.`);
      return null;
    }
    if (!alternate.alternates.some((candidate) => candidate.id === story.id)) {
      onWarning(`Cannot localize story ${story.uuid}: alternate link was not mutual.`);
      return null;
    }
    return alternate;
  } catch (error) {
    onWarning(
      `Cannot localize story ${story.uuid}: ${error instanceof Error ? error.message : "alternate fetch failed"}.`,
    );
    return null;
  }
}

/**
 * case-studies/home stores the English member. While only en and es-co are
 * supported, Spanish uses the single validated alternate. Revisit this
 * invariant before adding another locale.
 */
export async function resolveCaseStudyStoriesForLocale({
  stories,
  locale,
  version,
  fetchAlternate,
  onWarning = console.warn,
}: {
  stories: Story[];
  locale: SupportedLanguage;
  version: StoryblokVersion;
  fetchAlternate: (
    fullSlug: string,
    locale: SupportedLanguage,
    version: StoryblokVersion,
  ) => Promise<Story | null>;
  onWarning?: (message: string) => void;
}): Promise<Story[]> {
  if (locale === "en") return stories;
  const localized = await Promise.all(stories.map((story) =>
    resolveAlternateStory({ story, locale, version, fetchAlternate, onWarning })
  ));
  return localized.filter((story): story is Story => story !== null);
}

export type StoryLink = {
  id: number;
  slug: string;
  is_folder: boolean;
  name?: string;
  parent_id?: number;
  published?: boolean;
  uuid?: string;
};

type StoryLinksResponse = { links: Record<string, StoryLink> };

export async function getStoryLinks(
  version: StoryblokVersion = "published",
): Promise<StoryLink[]> {
  const perPage = 100;
  const links: StoryLink[] = [];

  for (let page = 1; ; page++) {
    const response = await requestStoryblok<StoryLinksResponse>("links", {
      version,
      params: { per_page: perPage, page },
      tags: ["cms:links"],
    });
    const pageLinks = Object.values(response.links);
    links.push(...pageLinks);
    if (pageLinks.length < perPage) break;
  }
  return links;
}

export async function getAllStoryParams(
  version: StoryblokVersion = "published",
): Promise<{ slug: string[] }[]> {
  const links = await getStoryLinks(version);
  return links.flatMap((link) => {
    if (link.is_folder && link.slug !== "/") return [];
    if (link.slug === "home") return [{ slug: [] }];
    const slug = link.slug.split("/").filter(Boolean);
    return slug.length ? [{ slug }] : [];
  });
}
