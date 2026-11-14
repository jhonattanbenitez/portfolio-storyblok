import { createHash } from "node:crypto";
import { evaluateFieldTranslation } from "./field-translation-content.mjs";

// Offline proposal, not imported by the application. Inputs contain an explicit
// raw published-snapshot attestation; CDA does not expose these raw i18n keys.
// This validates synthetic policy, not a ready-to-use CDA adapter or CMS workflow.
export function isValidPostSlug(value) {
  return typeof value === "string" && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validSource(story) {
  return Number.isSafeInteger(story?.id) && story.id > 0 &&
    typeof story.uuid === "string" && !!story.uuid.trim() &&
    story.content?.component === "post" && story.content.language === "english" &&
    isValidPostSlug(story.slug) && story.full_slug === `posts/${story.slug}` &&
    ["title", "intro", "content"].every((key) => typeof story.content[key] === "string" && !!story.content[key].trim());
}

function explicitSpanishFields(input) {
  const result = {};
  let suffix;
  for (const field of ["title", "intro", "content"]) {
    const key = input?.localizedFields?.[field];
    const prefix = `${field}__i18n__`;
    if (typeof key !== "string" || !key.startsWith(prefix) || !key.slice(prefix.length)) return null;
    const currentSuffix = key.slice(prefix.length);
    if (suffix !== undefined && suffix !== currentSuffix) return null;
    suffix = currentSuffix;
    const content = input?.baseStory?.content;
    if (!content || !Object.hasOwn(content, key) || typeof content[key] !== "string" || !content[key].trim()) return null;
    result[field] = content[key];
  }
  return result;
}

export function calculateEsApprovalHash(input) {
  const story = input?.baseStory;
  if (!validSource(story) || !isValidPostSlug(story.content.slug_es)) return null;
  // A reviewer can calculate the commitment from an explicit draft BEFORE
  // publication. Calculating a hash never grants approval or public eligibility.
  const spanish = explicitSpanishFields(input);
  if (!spanish) return null;
  const payload = {
    id: story.id, uuid: story.uuid, locale: "es-co", enSlug: story.slug,
    slug_es: story.content.slug_es,
    english: Object.fromEntries(["title", "intro", "content"].map((key) => [key, story.content[key]])),
    spanish,
    categoryIdentity: story.content.category_ref?.id ?? null,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function evaluateSlugEsRecord(input) {
  const story = input?.baseStory;
  const reject = (reason) => ({ eligible: false, reason });
  if (!validSource(story)) return reject("INVALID_SOURCE");
  const translation = evaluateFieldTranslation(input);
  if (!translation.eligible) return reject(translation.reason);
  if (!isValidPostSlug(story.content.slug_es)) return reject("INVALID_SLUG");
  if (story.content.es_translation_approved !== true) return reject("NOT_APPROVED");
  const expected = calculateEsApprovalHash(input);
  if (!expected || story.content.es_approved_hash !== expected) return reject("STALE_APPROVAL");
  return {
    eligible: true, reason: "READY", uuid: story.uuid, id: story.id,
    enHref: `/posts/${story.slug}`, esHref: `/es-co/posts/${story.content.slug_es}`,
    content: translation.content,
  };
}

function legacyRoute(story) {
  if (story?.published !== true || story.content?.component !== "post" ||
      !Number.isSafeInteger(story.id) || story.id <= 0 || typeof story.uuid !== "string" || !story.uuid.trim()) return null;
  const language = story.content.language;
  if (!["english", "spanish"].includes(language) || !isValidPostSlug(story.slug) || story.full_slug !== `posts/${story.slug}`) return null;
  const locale = language === "spanish" ? "es-co" : "en";
  return { locale, href: `${locale === "es-co" ? "/es-co" : ""}/${story.full_slug}`, uuid: story.uuid, id: story.id, model: "legacy" };
}

function mutualLegacyPair(source, spanish) {
  const refersTo = (from, to) => Array.isArray(from.alternates) && from.alternates.some((ref) =>
    ref.id === to.id && ref.full_slug === to.full_slug && ref.published === true);
  return source.uuid !== spanish.uuid && typeof source.group_id === "string" && !!source.group_id &&
    source.group_id === spanish.group_id && spanish.content?.language === "spanish" &&
    source.alternates?.length === 1 && spanish.alternates?.length === 1 &&
    refersTo(source, spanish) && refersTo(spanish, source);
}

function snapshotKey(story) {
  return JSON.stringify(story, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
    : value);
}

export function buildSlugEsCatalog({ publishedStories = [], candidates = [] } = {}) {
  const routes = new Map();
  const owners = new Map();
  const ambiguous = new Set();
  const inconsistentSnapshots = new Set();
  const publishedIdentityPaths = new Map();
  const conflictingIdentities = new Set();
  const diagnostics = [];
  const diagnose = (code, extra = {}) => diagnostics.push({ code, ...extra });
  for (const story of publishedStories) {
    const route = legacyRoute(story);
    if (!route) continue;
    const paths = publishedIdentityPaths.get(route.uuid) || new Set();
    paths.add(route.href); publishedIdentityPaths.set(route.uuid, paths);
    if (ambiguous.has(route.href)) continue;
    const prior = routes.get(route.href);
    if (prior && (prior.uuid !== route.uuid || prior.id !== route.id)) {
      routes.delete(route.href); owners.delete(route.href); ambiguous.add(route.href);
      diagnose("LEGACY_ROUTE_COLLISION", { href: route.href });
      continue;
    }
    if (prior) {
      if (snapshotKey(owners.get(route.href)) !== snapshotKey(story) && !inconsistentSnapshots.has(story.uuid)) {
        inconsistentSnapshots.add(story.uuid);
        diagnose("INCONSISTENT_PUBLISHED_SNAPSHOT", { uuid: story.uuid, href: route.href });
      }
      // An identical duplicate is harmless. Conflicting snapshots preserve the
      // unambiguous legacy URL identity but cannot authorize field-model adoption.
      continue;
    }
    routes.set(route.href, route); owners.set(route.href, story);
  }
  for (const [uuid, paths] of publishedIdentityPaths) {
    if (paths.size <= 1) continue;
    conflictingIdentities.add(uuid);
    diagnose("PUBLISHED_IDENTITY_CONFLICT", { uuid });
    for (const [href, route] of routes) {
      if (route.uuid === uuid) { routes.delete(href); owners.delete(href); }
    }
  }

  const legacyPairs = [];
  for (const source of owners.values()) {
    if (source.content.language !== "english" || inconsistentSnapshots.has(source.uuid)) continue;
    for (const spanish of owners.values()) {
      if (inconsistentSnapshots.has(spanish.uuid) || !mutualLegacyPair(source, spanish)) continue;
      legacyPairs.push({ enUuid: source.uuid, esUuid: spanish.uuid,
        enHref: `/${source.full_slug}`, esHref: `/es-co/${spanish.full_slug}` });
    }
  }

  const identities = new Map();
  const spanishClaims = new Map();
  for (const candidate of candidates) {
    const story = candidate?.baseStory;
    if (!story) continue;
    const idGroup = identities.get(story.uuid) || [];
    idGroup.push(candidate); identities.set(story.uuid, idGroup);
    if (isValidPostSlug(story.content?.slug_es)) {
      const group = spanishClaims.get(story.content.slug_es) || [];
      group.push(candidate); spanishClaims.set(story.content.slug_es, group);
    }
  }

  for (const input of candidates) {
    const story = input?.baseStory;
    const result = evaluateSlugEsRecord(input);
    if (!result.eligible) { diagnose(result.reason, { uuid: story?.uuid }); continue; }
    if (inconsistentSnapshots.has(story.uuid) || conflictingIdentities.has(story.uuid)) continue;
    if ((identities.get(story.uuid)?.length || 0) !== 1) {
      diagnose("DUPLICATE_CANDIDATE_IDENTITY", { uuid: story.uuid }); continue;
    }
    const claims = spanishClaims.get(story.content.slug_es) || [];
    if (new Set(claims.map((claim) => claim.baseStory.uuid)).size > 1) {
      diagnose("DUPLICATE_ES_SLUG", { slug: story.content.slug_es }); continue;
    }
    const english = routes.get(result.enHref);
    const source = owners.get(result.enHref);
    if (!english || english.uuid !== story.uuid || english.id !== story.id || source?.content?.language !== "english") {
      diagnose("EN_IDENTITY_COLLISION", { uuid: story.uuid }); continue;
    }
    // The candidate and index must describe the same reviewed snapshot. This is
    // an offline raw-snapshot comparison, not a claim that CDA returns raw keys.
    if (source.unpublished_changes !== false ||
        calculateEsApprovalHash({ ...input, baseStory: source }) !== calculateEsApprovalHash(input) ||
        source.content.es_translation_approved !== true || source.content.es_approved_hash !== story.content.es_approved_hash) {
      diagnose("SNAPSHOT_MISMATCH", { uuid: story.uuid }); continue;
    }
    if (ambiguous.has(result.esHref)) { diagnose("LEGACY_SLUG_COLLISION", { href: result.esHref }); continue; }
    const occupant = owners.get(result.esHref);
    if (occupant && !mutualLegacyPair(source, occupant)) {
      diagnose("LEGACY_SLUG_COLLISION", { href: result.esHref }); continue;
    }
    routes.set(result.enHref, { ...english, model: "field" });
    routes.set(result.esHref, { locale: "es-co", href: result.esHref, uuid: story.uuid, id: story.id, model: "field" });
  }
  return {
    routes: [...routes.values()].sort((a, b) => a.href.localeCompare(b.href)),
    diagnostics: diagnostics.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    legacyPairs: legacyPairs.sort((a, b) => a.enUuid.localeCompare(b.enUuid)),
    usableSnapshot: !ambiguous.size && !inconsistentSnapshots.size && !conflictingIdentities.size,
  };
}

export function resolveSlugEsPath(catalog, pathname) {
  return catalog.routes.find((route) => route.href === pathname) || null;
}

export function localizedUrlsForIdentity(catalog, uuid) {
  const paired = catalog.legacyPairs?.find((pair) => pair.enUuid === uuid || pair.esUuid === uuid);
  if (paired) {
    const english = resolveSlugEsPath(catalog, paired.enHref);
    const spanish = resolveSlugEsPath(catalog, paired.esHref);
    if (english?.model === "legacy" && spanish?.model === "legacy" &&
        english.uuid === paired.enUuid && spanish.uuid === paired.esUuid) {
      return [{ locale: "en", href: paired.enHref }, { locale: "es-co", href: paired.esHref }];
    }
  }
  return catalog.routes.filter((route) => route.uuid === uuid)
    .sort((a, b) => a.locale.localeCompare(b.locale))
    .map(({ locale, href }) => ({ locale, href }));
}

export function sameSlugRedirect(englishSlug, historicalSpanishSlug) {
  if (!isValidPostSlug(englishSlug) || !isValidPostSlug(historicalSpanishSlug) || englishSlug === historicalSpanishSlug) return null;
  const to = `/es-co/posts/${englishSlug}`;
  return { status: 308, from: `/es-co/posts/${historicalSpanishSlug}`, to, canonical: to };
}
