import { revalidateTag } from "next/cache";
import { CacheConfig, SupportedLanguage } from "./types";

// Cache configuration constants
export const CACHE_CONFIG: Record<string, CacheConfig> = {
  stories: {
    revalidate: 3600, // 1 hour
    tags: ["cms", "stories"],
  },
  story: {
    revalidate: 1800, // 30 minutes
    tags: ["cms", "story"],
  },
  posts: {
    revalidate: 1800, // 30 minutes
    tags: ["cms", "posts"],
  },
  metadata: {
    revalidate: 86400, // 24 hours
    tags: ["cms", "metadata"],
  },
};

// Cache tags for different content types
export const CACHE_TAGS = {
  CMS: "cms",
  STORY: (slug: string) => `story:${slug}`,
  LANGUAGE: (lang: SupportedLanguage) => `cms:${lang}`,
  POSTS: "posts",
  METADATA: "metadata",
} as const;

// Revalidation functions
export async function revalidateStory(slug: string) {
  try {
    revalidateTag(CACHE_TAGS.STORY(slug), "default");
    revalidateTag(CACHE_TAGS.CMS, "default");
    console.log(`Revalidated cache for story: ${slug}`);
  } catch (error) {
    console.error("Error revalidating story cache:", error);
  }
}

export async function revalidateLanguage(language: SupportedLanguage) {
  try {
    revalidateTag(CACHE_TAGS.LANGUAGE(language), "default");
    revalidateTag(CACHE_TAGS.CMS, "default");
    console.log(`Revalidated cache for language: ${language}`);
  } catch (error) {
    console.error("Error revalidating language cache:", error);
  }
}

export async function revalidateAll() {
  try {
    revalidateTag(CACHE_TAGS.CMS, "default");
    console.log("Revalidated all CMS cache");
  } catch (error) {
    console.error("Error revalidating all cache:", error);
  }
}

// Cache key generation
export function generateCacheKey(
  prefix: string,
  params: Record<string, string | number>,
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `${prefix}:${sortedParams}`;
}

// Cache duration helpers
export const CACHE_DURATIONS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// ISR configuration for different content types
export const ISR_CONFIG = {
  // Static pages that rarely change
  STATIC: {
    revalidate: CACHE_DURATIONS.VERY_LONG,
    tags: [CACHE_TAGS.CMS, CACHE_TAGS.METADATA],
  },
  // Dynamic content that changes frequently
  DYNAMIC: {
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.CMS, CACHE_TAGS.POSTS],
  },
  // Real-time content (draft mode)
  REALTIME: {
    revalidate: 0,
    tags: [CACHE_TAGS.CMS],
  },
} as const;
