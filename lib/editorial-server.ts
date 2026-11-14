import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { collectPublishedEditorialStories, getStoryByUuid } from "./storyblok-data";
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
      catch { return null; } // A rejected representation cannot replace a published legacy pair.
    }));
    spanishStories.push(...batch.filter((story): story is Story => story !== null));
  }
  return buildEditorialCatalog({ stories, spanishStories, categories: stories.filter((story) => story.content?.component === "Category") });
}

// Coalesce concurrent loads only. Next's tagged fetch cache owns persistence;
// React cache shares the immutable projection for a render. No durable last-good
// memory snapshot can outlive a tag revalidation or conceal a cold-start failure.
const publishedLoader = createEditorialCatalogLoader(loadPublishedCatalog, { ttlMs: 0 });

/** generateStaticParams has no incoming request; it may enumerate published data only. */
export async function getEditorialStaticCatalog(): Promise<EditorialCatalog | null> {
  if (!isEditorialModelEnabled()) return null;
  try { return await publishedLoader.get(); } catch { return null; }
}

export const getPublishedEditorialCatalog = cache(async (): Promise<EditorialCatalog | null> => {
  if (!isEditorialModelEnabled()) return null;
  // Feature-enabled builds keep list/sitemap consumers request-time rendered.
  // Feature selection must be identical during build and start; default builds
  // retain C3 prerendering and must be rebuilt before opting in.
  await connection();
  try { return await publishedLoader.get(); }
  catch { return null; } // Existing published transport remains the safe legacy fallback.
});
