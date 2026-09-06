import { revalidateTag } from "next/cache";
import { CacheConfig, SupportedLanguage } from "./types";
import { invalidateAllCmsCache, invalidateStoryCache } from "./revalidation";

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
type RevalidateTag = typeof revalidateTag;

export async function revalidateStory(slug: string, invalidate: RevalidateTag = revalidateTag) {
  invalidateStoryCache(slug, invalidate);
  console.log(`Revalidated cache for story: ${slug}`);
}

export async function revalidateLanguage(language: SupportedLanguage, invalidate: RevalidateTag = revalidateTag) {
  invalidate(CACHE_TAGS.LANGUAGE(language), "default");
  invalidate(CACHE_TAGS.CMS, "default");
  console.log(`Revalidated cache for language: ${language}`);
}

export async function revalidateAll(invalidate: RevalidateTag = revalidateTag) {
  invalidateAllCmsCache(invalidate);
  console.log("Revalidated all CMS cache");
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
