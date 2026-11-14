import {
  buildSlugEsCatalog,
  evaluateSlugEsRecord,
  localizedUrlsForIdentity,
  resolveSlugEsPath,
} from "./slug-es-routing.mjs";

/**
 * Local integrated rehearsal only; never imported by the application.
 * The source deliberately contains SYNTHETIC reviewed/raw published snapshots,
 * not CDA responses. A real CDA adapter cannot recreate raw __i18n__ properties
 * or claim these publication attestations from language/published_at alone.
 * This cache simulates policy; it is NOT Next.js/Vercel persistent caching.
 */
const SOURCE_KIND = "synthetic-reviewed-snapshot";
const ORIGIN = "https://www.jhonattan.dev";
const clone = (value) => structuredClone(value);
const knownLocale = (locale) => locale === "en" || locale === "es-co";

export class PilotCatalogUnavailable extends Error {
  constructor(code) {
    super(code);
    this.name = "PilotCatalogUnavailable";
    this.code = code;
  }
}

/** Page through the RAW count/total, before post/language filtering. */
export async function collectPilotPublishedPages(loadPage, {
  pageSize = 100, maxPages = 100,
} = {}) {
  if (typeof loadPage !== "function" || !Number.isSafeInteger(pageSize) ||
      pageSize < 1 || pageSize > 100 || !Number.isSafeInteger(maxPages) || maxPages < 1) {
    throw new TypeError("INVALID_PAGE_CONFIGURATION");
  }
  const records = [];
  let expectedTotal;
  for (let page = 1; page <= maxPages; page++) {
    const result = await loadPage({ page, perPage: pageSize, version: "published" });
    if (result?.sourceKind !== SOURCE_KIND || !Array.isArray(result.stories) ||
        result.stories.length > pageSize) throw new PilotCatalogUnavailable("INVALID_PUBLISHED_PAGE");
    if (result.total !== undefined) {
      if (!Number.isSafeInteger(result.total) || result.total < 0 ||
          (expectedTotal !== undefined && expectedTotal !== result.total)) {
        throw new PilotCatalogUnavailable("INCONSISTENT_PAGINATION");
      }
      expectedTotal = result.total;
    }
    records.push(...clone(result.stories));
    if (expectedTotal !== undefined) {
      if (records.length > expectedTotal ||
          (records.length < expectedTotal && result.stories.length < pageSize)) {
        throw new PilotCatalogUnavailable("INCOMPLETE_PAGINATION");
      }
      if (records.length === expectedTotal) return records;
    } else if (result.stories.length < pageSize) return records;
  }
  throw new PilotCatalogUnavailable("PAGE_LIMIT_EXCEEDED");
}

function categoryLocale(story) {
  if (story?.published !== true || !Number.isSafeInteger(story.id) || story.id < 1 ||
      typeof story.uuid !== "string" || !story.uuid ||
      typeof story.full_slug !== "string" || !story.full_slug ||
      story.content?.component !== "Category") return null;
  return story.content?.language === "english" ? "en" :
    story.content?.language === "spanish" ? "es-co" : null;
}

function categoryIdentity(categories, uuid, locale) {
  if (typeof uuid !== "string" || !uuid) return null;
  const sources = categories.filter((story) => story?.uuid === uuid && categoryLocale(story));
  if (sources.length !== 1) return null;
  const source = sources[0];
  if (categoryLocale(source) === locale) return source.uuid;
  const targets = categories.filter((story) => {
    const refersTo = (from, to) => Array.isArray(from.alternates) &&
      from.alternates.length === 1 && from.alternates[0]?.id === to.id &&
      from.alternates[0]?.full_slug === to.full_slug &&
      from.alternates[0]?.published === true;
    return categoryLocale(story) === locale && story.uuid !== source.uuid &&
      typeof source.group_id === "string" && !!source.group_id &&
      source.group_id === story.group_id && refersTo(source, story) && refersTo(story, source);
  });
  return targets.length === 1 ? targets[0].uuid : null;
}

function project(catalog, stories, candidates, categories, mode, diagnostics = []) {
  const eligible = new Map(candidates.map((input) => [input?.baseStory?.uuid, evaluateSlugEsRecord(input)]));
  const entries = catalog.routes.map((route) => {
    const source = stories.find((story) => story?.id === route.id && story?.uuid === route.uuid);
    const content = route.model === "field" && route.locale === "es-co"
      ? eligible.get(route.uuid)?.content : source?.content;
    return {
      ...route,
      title: content?.title ?? null,
      intro: content?.intro ?? null,
      content: content?.content ?? null,
      categoryUuid: categoryIdentity(categories, source?.content?.category_ref?.id, route.locale),
      localizedUrls: localizedUrlsForIdentity(catalog, route.uuid),
    };
  });
  return { mode, sourceKind: SOURCE_KIND, catalog, entries,
    diagnostics: [...catalog.diagnostics, ...diagnostics] };
}

/**
 * All loaders are injected LOCAL fixtures; this module performs no network IO.
 * loadCandidates receives a copy of the complete normalized published inventory.
 * An optional independent legacy loader permits a tested cold-start fallback.
 * Expired snapshots are never returned on error; no durable last-good is implied.
 */
export function createIntegratedSlugEsPilot({
  loadPublishedPage,
  loadCandidates = async () => [],
  loadCategories = async () => [],
  loadLegacyPublishedPage,
  pageSize = 100,
  maxPages = 100,
  ttlMs = 60_000,
  now = Date.now,
} = {}) {
  if (typeof loadPublishedPage !== "function" || typeof loadCandidates !== "function" ||
      typeof loadCategories !== "function" || typeof now !== "function" ||
      (loadLegacyPublishedPage !== undefined && typeof loadLegacyPublishedPage !== "function") ||
      !Number.isFinite(ttlMs) || ttlMs < 0) throw new TypeError("INVALID_PILOT_CONFIGURATION");
  let cached;
  let expiresAt = 0;
  let inFlight;
  let generation = 0;
  const pageOptions = { pageSize, maxPages };

  async function legacyFallback(code) {
    if (!loadLegacyPublishedPage) throw new PilotCatalogUnavailable(code);
    try {
      const stories = await collectPilotPublishedPages(loadLegacyPublishedPage, pageOptions);
      const catalog = buildSlugEsCatalog({ publishedStories: stories });
      if (!catalog.usableSnapshot) throw new PilotCatalogUnavailable("INVALID_LEGACY_SNAPSHOT");
      return project(catalog, stories, [], [], "legacy-fallback", [{ code }]);
    } catch {
      throw new PilotCatalogUnavailable("PUBLISHED_AND_LEGACY_UNAVAILABLE");
    }
  }

  async function refresh() {
    let stories;
    try {
      stories = await collectPilotPublishedPages(loadPublishedPage, pageOptions);
    } catch {
      return legacyFallback("PUBLISHED_SOURCE_UNAVAILABLE");
    }
    // Validate legacy independently before considering any field-model adoption.
    const legacy = buildSlugEsCatalog({ publishedStories: stories });
    if (!legacy.usableSnapshot) return legacyFallback("INVALID_PUBLISHED_SNAPSHOT");
    let candidates;
    let categories;
    try {
      [candidates, categories] = await Promise.all([
        loadCandidates(clone(stories)), loadCategories(),
      ]);
      if (!Array.isArray(candidates) || !Array.isArray(categories)) throw new TypeError();
      candidates = clone(candidates);
      categories = clone(categories);
    } catch {
      return project(legacy, stories, [], [], "legacy-fallback", [{ code: "CANDIDATE_SOURCE_UNAVAILABLE" }]);
    }
    const catalog = buildSlugEsCatalog({ publishedStories: stories, candidates });
    if (!catalog.usableSnapshot) {
      return project(legacy, stories, [], categories, "legacy-fallback", [{ code: "INVALID_CANDIDATE_CATALOG" }]);
    }
    return project(catalog, stories, candidates, categories, "validated");
  }

  async function getCatalog() {
    const timestamp = now();
    if (!Number.isFinite(timestamp)) throw new TypeError("INVALID_CLOCK");
    if (cached && timestamp < expiresAt) return clone(cached);
    if (!inFlight) {
      const requestedGeneration = generation;
      const request = refresh().then((snapshot) => {
        if (requestedGeneration === generation) {
          cached = snapshot;
          expiresAt = now() + ttlMs;
        }
        return snapshot;
      });
      inFlight = request;
      request.finally(() => { if (inFlight === request) inFlight = undefined; }).catch(() => {});
    }
    return clone(await inFlight);
  }

  async function resolve(pathname) {
    const snapshot = await getCatalog();
    const route = resolveSlugEsPath(snapshot.catalog, pathname);
    return route ? snapshot.entries.find((entry) => entry.href === route.href) : null;
  }

  async function list(locale, { categoryUuid } = {}) {
    if (!knownLocale(locale)) return [];
    return (await getCatalog()).entries.filter((entry) => entry.locale === locale &&
      (categoryUuid === undefined || entry.categoryUuid === categoryUuid));
  }

  async function metadata(pathname) {
    const entry = await resolve(pathname);
    if (!entry) return null;
    return {
      canonical: `${ORIGIN}${entry.href}`,
      languages: Object.fromEntries(entry.localizedUrls.map(({ locale, href }) => [locale, `${ORIGIN}${href}`])),
    };
  }

  async function sitemap() {
    const snapshot = await getCatalog();
    return snapshot.entries.map((entry) => ({
      url: `${ORIGIN}${entry.href}`,
      alternates: { languages: Object.fromEntries(entry.localizedUrls.map(({ locale, href }) => [locale, `${ORIGIN}${href}`])) },
    }));
  }

  function invalidate() {
    generation++;
    cached = undefined;
    expiresAt = 0;
    inFlight = undefined;
  }

  return { getCatalog, resolve, list, metadata, sitemap, invalidate };
}
