import { StoriesResponse } from "./types";

type Language = "en" | "es" | "es-co";

interface FetchStoriesOpts {
  version: "draft" | "published";
  language?: Language;
  startsWith?: string; 
  perPage?: number; 
  categorySlug?: string; 
}

export const fetchStories = async ({
  version,
  language = "en",
  startsWith = "posts/",
  perPage = 25,
  categorySlug,
}: FetchStoriesOpts): Promise<StoriesResponse | null> => {
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;
  if (!token) {
    console.error("Storyblok API Token is missing");
    return null;
  }

  const params = new URLSearchParams({
    token,
    version,
    starts_with: startsWith,
    language, 
    per_page: String(perPage),
    fallback_lang: "false",
  });

  if (categorySlug) {

    const categoryCachedUrl = `categories/${categorySlug}`;
    params.append(
      "filter_query[category_ref.cached_url][in]",
      categoryCachedUrl
    );

    console.log("Filtering by category cached_url:", categoryCachedUrl);
  }

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
