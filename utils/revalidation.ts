export type CacheInvalidator = (tag: string, profile: "default") => void;

export function invalidateStoryCache(
  slug: string,
  invalidate: CacheInvalidator,
): void {
  invalidate(`story:${slug}`, "default");
  invalidate("cms", "default");
}

export function invalidateAllCmsCache(invalidate: CacheInvalidator): void {
  invalidate("cms", "default");
}

