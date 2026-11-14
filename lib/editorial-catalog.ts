import { createHash } from "node:crypto";
import type { LocalizedUrl, Story, SupportedLanguage } from "../utils/types.ts";
import { STORYBLOK_LOCALES } from "./storyblok-locales.ts";

export type EditorialEntry = {
  uuid: string;
  locale: SupportedLanguage;
  href: string;
  story: Story;
  localizedUrls: LocalizedUrl[];
  categoryUuid: string | null;
  categorySlug: string | null;
  model: "legacy" | "field";
};
export type EditorialCatalog = { entries: EditorialEntry[]; diagnostics: string[] };
export class EditorialCatalogError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; this.name = "EditorialCatalogError"; }
}
type TextFields = Pick<Story["content"], "title" | "intro" | "content">;
const textKeys = ["title", "intro", "content"] as const;
const clone = <T>(value: T): T => structuredClone(value);
const nonblank = (value: unknown): value is string => typeof value === "string" && !!value.trim();

export function isEditorialModelEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return typeof window === "undefined" && env.STORYBLOK_FIELD_TRANSLATION_ENABLED === "true";
}

export function isEditorialSlug(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 160 &&
    !/[^a-z0-9-]/.test(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isEditorialUuid(value: unknown): value is string {
  return typeof value === "string" && value.length === 36 && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
}

/** Used only with responses obtained through a fixed version=published transport. */
export function isPublishedEditorialStory(story: Story): boolean {
  return !!story && Number.isSafeInteger(story.id) && story.id > 0 && nonblank(story.uuid) &&
    story.published !== false && nonblank(story.published_at) && Number.isFinite(Date.parse(story.published_at));
}

function baseIsValid(story: Story): boolean {
  return !!story && isEditorialUuid(story.uuid) && Number.isSafeInteger(story.id) && story.id > 0 &&
    story.content?.component === "post" && story.content.language === "english" &&
    isEditorialSlug(story.slug) && story.full_slug === `posts/${story.slug}` &&
    isEditorialSlug(story.content.slug_es) && textKeys.every((key) => nonblank(story.content[key]));
}

/** Same v1 commitment as the reviewed pilot. No publication/approval is granted by calculation. */
export function calculateEditorialApprovalHash(base: Story, spanish: TextFields): string | null {
  if (!baseIsValid(base) || !spanish || !textKeys.every((key) => nonblank(spanish[key]))) return null;
  const payload = {
    id: base.id, uuid: base.uuid, locale: "es-co", enSlug: base.slug,
    slug_es: base.content.slug_es,
    english: Object.fromEntries(textKeys.map((key) => [key, base.content[key]])),
    spanish: Object.fromEntries(textKeys.map((key) => [key, spanish[key]])),
    categoryIdentity: base.content.category_ref?.id ?? null,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Private editorial tooling may calculate from explicit native raw keys; never read aliases/fallback. */
export function calculateDraftEditorialApprovalHash(story: Story): string | null {
  const spanish = {} as TextFields;
  for (const key of textKeys) {
    const raw = `${key}__i18n__${STORYBLOK_LOCALES["es-co"].mapiSuffix}` as const;
    if (!Object.hasOwn(story.content, raw) || !nonblank(story.content[raw])) return null;
    spanish[key] = story.content[raw];
  }
  return calculateEditorialApprovalHash(story, spanish);
}

function sameSnapshot(a: Story, b: Story): boolean {
  const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) :
    value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)])) : value;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function paired(a: Story, b: Story): boolean {
  const pointsTo = (from: Story, to: Story) => Array.isArray(from.alternates) && from.alternates.length === 1 &&
    from.alternates[0]?.id === to.id && from.alternates[0]?.full_slug === to.full_slug && from.alternates[0]?.published === true;
  return a.uuid !== b.uuid && nonblank(a.group_id) && a.group_id === b.group_id &&
    pointsTo(a, b) && pointsTo(b, a);
}

function localeOf(story: Story): SupportedLanguage | null {
  return story.content?.language === "english" ? "en" : story.content?.language === "spanish" ? "es-co" : null;
}

function categoryFor(story: Story, locale: SupportedLanguage, categories: Story[]): Story | null {
  const reference = story.content.category_ref;
  const sources = categories.filter((category) => isPublishedEditorialStory(category) &&
    category.content?.component === "Category" && (reference?.id ? category.uuid === reference.id : category.full_slug === reference?.cached_url));
  if (sources.length !== 1) return null;
  const source = sources[0];
  if (localeOf(source) === locale) return source;
  const targets = categories.filter((category) => isPublishedEditorialStory(category) &&
    category.content?.component === "Category" && localeOf(category) === locale && paired(source, category));
  return targets.length === 1 ? targets[0] : null;
}

/** Inputs are published CDA representations, not raw MAPI drafts or fabricated raw attestations. */
export function buildEditorialCatalog({ stories, spanishStories = [], categories = [] }: {
  stories: Story[]; spanishStories?: Story[]; categories?: Story[];
}): EditorialCatalog {
  const routes = new Map<string, EditorialEntry>();
  const sources = new Map<string, Story>();
  const diagnostics: string[] = [];
  for (const input of stories) {
    if (!isPublishedEditorialStory(input) || input.content?.component !== "post") continue;
    const locale = localeOf(input);
    if (!locale || !isEditorialSlug(input.slug) || input.full_slug !== `posts/${input.slug}`) {
      throw new EditorialCatalogError("INVALID_LEGACY_POST");
    }
    const story = clone(input);
    delete story.editorial;
    const href = `${locale === "es-co" ? "/es-co" : ""}/${story.full_slug}`;
    const prior = routes.get(href);
    if (prior && (prior.uuid !== story.uuid || prior.story.id !== story.id || !sameSnapshot(prior.story, story))) {
      throw new EditorialCatalogError("AMBIGUOUS_PUBLISHED_ROUTE");
    }
    const identity = sources.get(story.uuid);
    if (identity && !sameSnapshot(identity, story)) throw new EditorialCatalogError("AMBIGUOUS_PUBLISHED_IDENTITY");
    sources.set(story.uuid, story);
    routes.set(href, { uuid: story.uuid, locale, href, story, model: "legacy", localizedUrls: [], categoryUuid: null, categorySlug: null });
  }
  const claims = new Map<string, Set<string>>();
  for (const story of sources.values()) {
    if (story.content.language !== "english" || !isEditorialSlug(story.content.slug_es)) continue;
    const owners = claims.get(story.content.slug_es) || new Set<string>();
    owners.add(story.uuid); claims.set(story.content.slug_es, owners);
  }
  for (const base of sources.values()) {
    if (!base.content.slug_es || base.content.language !== "english") continue;
    if (!baseIsValid(base)) { diagnostics.push("INVALID_FIELD_SOURCE"); continue; }
    if ((claims.get(base.content.slug_es)?.size || 0) > 1) { diagnostics.push("DUPLICATE_ES_SLUG"); continue; }
    if (base.content.es_translation_approved !== true) { diagnostics.push("NOT_APPROVED"); continue; }
    if (!/^[a-f0-9]{64}$/.test(base.content.es_approved_hash || "")) { diagnostics.push("INVALID_APPROVAL_HASH"); continue; }
    const representations = spanishStories.filter((story) => story?.uuid === base.uuid);
    if (representations.length !== 1) { diagnostics.push("MISSING_OR_DUPLICATE_ES_REPRESENTATION"); continue; }
    const es = representations[0];
    // CDA prefixes only the localized representation. Compare the exact expected
    // path; never decode, strip arbitrary locale segments, or use it as a route.
    const expectedSpanishFullSlug = `${STORYBLOK_LOCALES["es-co"].cdaLanguage}/${base.full_slug}`;
    const sharedMatch = isPublishedEditorialStory(es) && es.id === base.id && es.slug === base.slug && es.full_slug === expectedSpanishFullSlug &&
      es.content?.component === "post" && es.content.language === "english" && es.content.slug_es === base.content.slug_es &&
      es.content.es_translation_approved === true && es.content.es_approved_hash === base.content.es_approved_hash &&
      (es.content.category_ref?.id ?? null) === (base.content.category_ref?.id ?? null);
    if (!sharedMatch || !textKeys.every((key) => nonblank(es.content[key]))) { diagnostics.push("INVALID_ES_REPRESENTATION"); continue; }
    // CDA cannot reveal raw-key origin. Only a payload matching the human-reviewed
    // commitment may be adopted; a different English fallback fails this digest.
    if (calculateEditorialApprovalHash(base, es.content) !== base.content.es_approved_hash) { diagnostics.push("STALE_APPROVAL"); continue; }
    const enHref = `/posts/${base.slug}`;
    const esHref = `/es-co/posts/${base.content.slug_es}`;
    const occupant = routes.get(esHref);
    if (occupant && (occupant.story.content.language !== "spanish" || !paired(base, occupant.story))) {
      diagnostics.push("LEGACY_SLUG_COLLISION"); continue;
    }
    const spanish = clone(base);
    for (const key of textKeys) spanish.content[key] = es.content[key];
    routes.set(enHref, { uuid: base.uuid, locale: "en", href: enHref, story: clone(base), model: "field", localizedUrls: [], categoryUuid: null, categorySlug: null });
    routes.set(esHref, { uuid: base.uuid, locale: "es-co", href: esHref, story: spanish, model: "field", localizedUrls: [], categoryUuid: null, categorySlug: null });
  }
  const entries = [...routes.values()].sort((a, b) => a.href.localeCompare(b.href));
  for (const entry of entries) {
    let urls = entries.filter((other) => other.uuid === entry.uuid).map(({ locale, href }) => ({ locale, href }));
    if (entry.model === "legacy") {
      const other = entries.filter((candidate) => candidate.model === "legacy" && candidate.locale !== entry.locale && paired(entry.story, candidate.story));
      if (other.length === 1) urls = [entry, other[0]].map(({ locale, href }) => ({ locale, href }));
    }
    entry.localizedUrls = urls.sort((a, b) => a.locale.localeCompare(b.locale));
    const category = categoryFor(entry.story, entry.locale, categories);
    entry.categoryUuid = category?.uuid ?? null;
    entry.categorySlug = category && isEditorialSlug(category.slug) ? category.slug : null;
    entry.story.editorial = { href: entry.href, locale: entry.locale, localizedUrls: clone(entry.localizedUrls), model: entry.model };
  }
  return { entries, diagnostics };
}

export function findEditorialEntry(catalog: EditorialCatalog, href: string): EditorialEntry | null {
  return clone(catalog.entries.find((entry) => entry.href === href) || null);
}

export function getEditorialPosts(catalog: EditorialCatalog, locale: SupportedLanguage, categorySlug?: string): Story[] {
  return clone(catalog.entries.filter((entry) => entry.locale === locale &&
    (!categorySlug || entry.categorySlug === categorySlug)).map((entry) => entry.story))
    .sort((a, b) => (b.content.date || "").localeCompare(a.content.date || "") || b.id - a.id);
}

export function toEditorialSitemapEntries(catalog: EditorialCatalog) {
  return catalog.entries.map((entry) => ({ url: { locale: entry.locale, href: entry.href }, alternates: clone(entry.localizedUrls), lastModified: entry.story.updated_at }));
}

/** Published-only projection cache; errors/expired data are never a durable last-good. */
export function createEditorialCatalogLoader(load: () => Promise<EditorialCatalog>, {
  now = Date.now, ttlMs = 60_000,
}: { now?: () => number; ttlMs?: number } = {}) {
  if (!Number.isFinite(ttlMs) || ttlMs < 0) throw new EditorialCatalogError("INVALID_CACHE_TTL");
  let value: EditorialCatalog | undefined;
  let expires = 0;
  let flight: Promise<EditorialCatalog> | undefined;
  let generation = 0;
  return {
    async get(): Promise<EditorialCatalog> {
      const timestamp = now();
      if (!Number.isFinite(timestamp)) throw new EditorialCatalogError("INVALID_CACHE_CLOCK");
      if (value && timestamp < expires) return clone(value);
      if (!flight) {
        const current = generation;
        const request = Promise.resolve().then(load).then((catalog) => {
          if (current === generation) { value = clone(catalog); expires = now() + ttlMs; }
          return catalog;
        });
        flight = request;
        request.finally(() => { if (flight === request) flight = undefined; }).catch(() => {});
      }
      return clone(await flight);
    },
    invalidate() { generation++; value = undefined; expires = 0; flight = undefined; },
  };
}
