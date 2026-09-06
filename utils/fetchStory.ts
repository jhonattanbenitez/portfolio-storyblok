import { getStoryblokApi } from "../lib/storyblok";
import {
  StoryblokApiResponse,
  SupportedLanguage,
  ApiError,
  Story,
} from "./types";

const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

// Helper to wait
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for fetch with retry
async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited
        const waitTime =
          BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000; // Exponential backoff + jitter
        console.warn(
          `Rate limited (429). Retrying in ${Math.round(waitTime)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await delay(waitTime);
        attempt++;
        continue;
      }

      // If 5xx error, we might also want to retry, but let's stick to 429 for now or generic server errors if needed
      if (response.status >= 500) {
        const waitTime = BASE_DELAY * Math.pow(2, attempt);
        console.warn(
          `Server error (${response.status}). Retrying in ${Math.round(waitTime)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await delay(waitTime);
        attempt++;
        continue;
      }

      return response;
    } catch (error) {
      console.error(`Fetch error on attempt ${attempt + 1}:`, error);
      // Network errors invoke a retry
      const waitTime = BASE_DELAY * Math.pow(2, attempt);
      await delay(waitTime);
      attempt++;
    }
  }

  throw new Error(`Failed to fetch after ${MAX_RETRIES} attempts`);
}

export const fetchStory = async (
  version: "draft" | "published",
  slug?: string[],
  resolveRelations?: string,
): Promise<StoryblokApiResponse | null> => {
  try {
    getStoryblokApi(version === "draft");

    const { language, storySlug } = parseSlugAndLanguage(slug);
    const correctSlug = `/${storySlug}`;
    const token =
      version === "draft"
        ? process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN
        : process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

    if (!token) {
      const error: ApiError = {
        message: "Storyblok API Token is missing",
        code: "MISSING_TOKEN",
      };
      console.error(error.message);
      throw error;
    }

    const searchParams: Record<string, string> = {
      version,
      token,
      language,
    };

    if (resolveRelations) {
      searchParams.resolve_relations = resolveRelations;
    }

    const params = new URLSearchParams(searchParams);

    const fetchUrl = `https://api-us.storyblok.com/v2/cdn/stories${correctSlug}?${params.toString()}`;

    const response = await fetchWithRetry(fetchUrl, {
      next: {
        tags: ["cms", `cms:${language}`, `story:${storySlug}`],
        revalidate: version === "published" ? 3600 : 0,
      },
      cache: version === "published" ? "default" : "no-store",
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `Failed to fetch story: ${response.statusText}`,
        status: response.status,
        code: "FETCH_ERROR",
      };
      throw error;
    }

    const data = (await response.json()) as StoryblokApiResponse;

    if (!data.story) {
      const error: ApiError = {
        message: "Story not found",
        status: 404,
        code: "STORY_NOT_FOUND",
      };
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching story:", error);

    if (error && typeof error === "object" && "message" in error) {
      throw error as ApiError;
    }

    const unexpectedError: ApiError = {
      message: "An unexpected error occurred while fetching the story",
      code: "UNEXPECTED_ERROR",
    };
    throw unexpectedError;
  }
};

function parseSlugAndLanguage(slug?: string[]): {
  language: SupportedLanguage;
  storySlug: string;
} {
  let language: SupportedLanguage = "en";
  let storySlug = "home";

  if (slug && slug.length > 0) {
    if (slug[0] === "es-co") {
      language = "es-co";
      storySlug = slug.slice(1).join("/") || "home";
    } else {
      storySlug = slug.join("/");
    }
  }

  return { language, storySlug };
}

export const fetchStoriesByUuids = async (
  version: "draft" | "published",
  uuids: string[],
  language: SupportedLanguage = "en",
): Promise<Story[]> => {
  try {
    if (uuids.length === 0) return [];

    const token =
      version === "draft"
        ? process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN
        : process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

    if (!token) throw new Error("Missing Token");

    const searchParams = new URLSearchParams({
      version,
      token,
      language,
      by_uuids: uuids.join(","),
    });

    const response = await fetchWithRetry(
      `https://api-us.storyblok.com/v2/cdn/stories?${searchParams.toString()}`,
      {
        next: { tags: ["cms", `cms:stories`] },
        cache: version === "published" ? "default" : "no-store",
      },
    );

    const data = await response.json();
    return data.stories || [];
  } catch (error) {
    console.error("Error fetching stories by UUIDs:", error);
    return [];
  }
};

export const fetchAllStorySlugs = async (
  version: "draft" | "published" = "published",
): Promise<{ slug: string[] }[]> => {
  try {
    const token =
      version === "draft"
        ? process.env.NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN
        : process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;

    if (!token) throw new Error("Missing Token");

    const searchParams = new URLSearchParams({
      version,
      token,
      per_page: "100", // Start with 100, might need pagination for larger sites
    });

    const response = await fetchWithRetry(
      `https://api-us.storyblok.com/v2/cdn/links?${searchParams.toString()}`,
      {
        next: { tags: ["cms", "cms:links"] },
        cache: version === "published" ? "default" : "no-store",
      },
    );

    const data = await response.json();
    const links = data.links;

    const paths: { slug: string[] }[] = [];

    Object.keys(links).forEach((key) => {
      const link = links[key];
      // Filter out folders or non-page items if necessary, though 'is_folder' check might be needed.
      // For now we include everything that's not a folder, or handle folders if they have content.
      // Usually folders are just containers.
      if (link.is_folder && link.slug !== "/") return;

      const slug = link.slug;
      if (slug === "home") {
        paths.push({ slug: [] });
      } else {
        const parts = slug.split("/").filter((p: string) => p);
        if (parts.length > 0) {
          paths.push({ slug: parts });
        }
      }
    });

    return paths;
  } catch (error) {
    console.error("Error fetching all story slugs:", error);
    return [];
  }
};
