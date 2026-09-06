import type { StoriesResponse, Story, SupportedLanguage } from "./types";

type Language = "en" | "es-co";
export type PostContentLanguage = "english" | "spanish";

interface FetchStoriesOpts {
  version: "draft" | "published";
  language?: Language;
  startsWith?: string; 
  perPage?: number; 
  categorySlug?: string; 
  contentLanguage?: PostContentLanguage;
}

export function getPostContentLanguage(
  locale: SupportedLanguage,
): PostContentLanguage {
  return locale === "es-co" ? "spanish" : "english";
}

export function filterPostsForLocale(
  stories: Story[],
  locale: SupportedLanguage,
): Story[] {
  const contentLanguage = getPostContentLanguage(locale);
  return stories.filter((story) => story.content.language === contentLanguage);
}

export function buildStoriesSearchParams({
  token,
  version,
  language,
  startsWith,
  perPage,
  categorySlug,
  contentLanguage,
}: FetchStoriesOpts & { token: string }): URLSearchParams {
  const params = new URLSearchParams({
    token,
    version,
    starts_with: startsWith ?? "posts/",
    language: language ?? "en",
    per_page: String(perPage ?? 25),
    fallback_lang: "false",
  });

  if (categorySlug) {
    params.set(
      "filter_query[category_ref.cached_url][in]",
      `categories/${categorySlug}`,
    );
  }

  if (contentLanguage) {
    params.set("filter_query[language][in]", contentLanguage);
  }

  return params;
}

export const fetchStories = async ({
  version,
  language = "en",
  startsWith = "posts/",
  perPage = 25,
  categorySlug,
  contentLanguage,
}: FetchStoriesOpts): Promise<StoriesResponse | null> => {
  const token =
    process.env.STORYBLOK_TOKEN || process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;
  if (!token) {
    console.error("Storyblok API Token is missing");
    return null;
  }

  const params = buildStoriesSearchParams({
    token,
    version,
    startsWith,
    language,
    perPage,
    categorySlug,
    contentLanguage,
  });

  try {
    const response = await fetch(
      `https://api-us.storyblok.com/v2/cdn/stories?${params.toString()}`,
      {
        next: { tags: ["cms", `cms:${language}`] }, 
        cache: version === "published" ? "default" : "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch stories: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as StoriesResponse;
    return data;
  } catch (error) {
    console.error("Error fetching stories:", error);
    return null;
  }
};

export async function fetchPosts({
  version,
  locale,
  categorySlug,
}: {
  version: "draft" | "published";
  locale: SupportedLanguage;
  categorySlug?: string;
}): Promise<Story[]> {
  const response = await fetchStories({
    version,
    language: locale,
    startsWith: "posts/",
    perPage: 100,
    categorySlug,
    contentLanguage: getPostContentLanguage(locale),
  });

  return filterPostsForLocale(response?.stories ?? [], locale);
}
