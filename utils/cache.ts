import { revalidateTag } from "next/cache";
import { invalidateAllCmsCache, invalidateStoryCache } from "./revalidation";

type RevalidateTag = typeof revalidateTag;

export async function revalidateStory(
  slug: string,
  invalidate: RevalidateTag = revalidateTag,
) {
  invalidateStoryCache(slug, invalidate);
  console.log(`Revalidated cache for story: ${slug}`);
}

export async function revalidateAll(invalidate: RevalidateTag = revalidateTag) {
  invalidateAllCmsCache(invalidate);
  console.log("Revalidated all CMS cache");
}
