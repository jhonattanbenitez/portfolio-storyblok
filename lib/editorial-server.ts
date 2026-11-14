import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { collectPublishedEditorialStories, getStoryByUuid, getStoryblokToken, isStoryblokNotFound } from "./storyblok-data";
import { buildEditorialCatalog, createEditorialCatalogLoader, isEditorialModelEnabled, type EditorialCatalog } from "./editorial-catalog";
import type { Story } from "../utils/types";

async function loadPublishedCatalog(): Promise<EditorialCatalog> {
  const stories = await collectPublishedEditorialStories();
  const candidates = stories.filter((story) => story.content?.component === "post" &&
    story.content.language === "english" && story.content.es_translation_approved === true);
  const spanishStories: Story[] = [];
  // Bound cold-start fan-out rather than consuming a CDA quota in one burst.
  for (let offset = 0; offset < candidates.length; offset += 4) {
    const batch = await Promise.all(candidates.slice(offset, offset + 4).map(async (story) => {
      try { return (await getStoryByUuid({ uuid: story.uuid, version: "published", locale: "es-co" })).story; }
      catch (error) {
        // A missing representation may retain its validated legacy pair.
        // An unavailable provider must not produce a partial catalog.
        if (isStoryblokNotFound(error)) return null;
        throw error;
      }
    }));
    spanishStories.push(...batch.filter((story): story is Story => story !== null));
  }
  return buildEditorialCatalog({ stories, spanishStories, categories: stories.filter((story) => story.content?.component === "Category") });
}

// Cache the public projection in Next's Data Cache, not in durable process memory.
// Otherwise even cached CDA reads would repeatedly enter the transport's pacing
// queue on every request. Existing story/all revalidation invalidates "cms".
function taggedPublishedCatalog() {
  const credentialScope = createHash("sha256").update(getStoryblokToken("published")).digest("hex");
  return unstable_cache(loadPublishedCatalog, ["published-editorial-catalog-v1", credentialScope], {
    revalidate: 3600,
    tags: ["cms", "cms:stories", "cms:en", "cms:es-co"],
  })();
}

// Coalesce only concurrent fills. Errors are never stored as an empty catalog.
const publishedLoader = createEditorialCatalogLoader(taggedPublishedCatalog, { ttlMs: 0 });

/** generateStaticParams has no incoming request; it may enumerate published data only. */
export async function getEditorialStaticCatalog(): Promise<EditorialCatalog | null> {
  if (!isEditorialModelEnabled()) return null;
  return publishedLoader.get();
}

export const getPublishedEditorialCatalog = cache(async (): Promise<EditorialCatalog | null> => {
  if (!isEditorialModelEnabled()) return null;
  // Feature-enabled builds keep list/sitemap consumers request-time rendered.
  // Feature selection must be identical during build and start; default builds
  // retain C3 prerendering and must be rebuilt before opting in.
  await connection();
  return publishedLoader.get();
});
