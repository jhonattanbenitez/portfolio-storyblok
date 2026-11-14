import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEditorialCatalog, calculateDraftEditorialApprovalHash, calculateEditorialApprovalHash,
  isEditorialSlug, isEditorialUuid,
} from "../../lib/editorial-catalog.ts";

// Offline preparation and receipt verification only. No HTTP, credentials, MCP
// mutation, publication or deployment is implemented by this program.
const repository = fileURLToPath(new URL("../../", import.meta.url));
const textFields = ["title", "intro", "content"];
const translatedKeys = textFields.map((key) => `${key}__i18n__es_co`);
const targetKeys = [...translatedKeys, "slug_es", "es_translation_approved", "es_approved_hash"];
const clone = (value) => structuredClone(value);
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
export const canonicalHash = (value) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const same = (a, b) => canonicalHash(a) === canonicalHash(b);
const required = (condition, code) => assert.ok(condition, code);
const nonblank = (value) => typeof value === "string" && !!value.trim();
const blackBoxUuid = "6bffd408-51d4-403b-a64a-cd22e3c3e287";

function rejectCredentials(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    required(!/^(?:preview_token|access_token|refresh_token|authorization|cookies?)$/i.test(key), "CREDENTIAL_FIELD_FORBIDDEN");
    rejectCredentials(item);
  }
}
function validIdentity(story) {
  return Number.isSafeInteger(story?.id) && story.id > 0 && isEditorialUuid(story.uuid) &&
    isEditorialSlug(story.slug) && story.full_slug === `posts/${story.slug}`;
}
function reciprocal(a, b) {
  const points = (from, to) => Array.isArray(from.alternates) && from.alternates.length === 1 &&
    from.alternates[0].id === to.id && from.alternates[0].full_slug === to.full_slug && from.alternates[0].published === true;
  return nonblank(a.group_id) && a.group_id === b.group_id && a.id !== b.id && a.uuid !== b.uuid && points(a, b) && points(b, a);
}
function pairPosts(stories, expectedPairs) {
  const posts = stories.filter((story) => story.content?.component === "post" && story.published !== false && story.published_at);
  required(posts.length === expectedPairs * 2, "PUBLISHED_POST_COUNT_CHANGED");
  required(new Set(posts.map((s) => s.uuid)).size === posts.length && new Set(posts.map((s) => s.id)).size === posts.length, "DUPLICATE_IDENTITY");
  const groups = new Map();
  for (const story of posts) {
    required(validIdentity(story), "INVALID_HISTORICAL_PATH_OR_IDENTITY");
    required(nonblank(story.group_id), "MISSING_GROUP_ID");
    groups.set(story.group_id, [...(groups.get(story.group_id) || []), story]);
  }
  required(groups.size === expectedPairs, "PAIR_GROUP_COUNT_CHANGED");
  return [...groups.values()].map((group) => {
    required(group.length === 2, "AMBIGUOUS_GROUP");
    const en = group.find((s) => s.content.language === "english");
    const es = group.find((s) => s.content.language === "spanish");
    required(en && es && reciprocal(en, es), "NONRECIPROCAL_LANGUAGE_PAIR");
    return { en, es };
  }).sort((a, b) => a.en.uuid.localeCompare(b.en.uuid));
}
const precondition = (story) => ({
  id: story.id, uuid: story.uuid, updated_at: story.updated_at,
  current_version_id: story.current_version_id ?? null,
  contentCanonicalSha256: canonicalHash(story.content), selectedStoryCanonicalSha256: canonicalHash(story),
});
const publicContent = (content) => Object.fromEntries(Object.entries(content).filter(([key]) => !key.includes("__i18n__")));
function stripNative(story) {
  const result = clone(story);
  for (const key of Object.keys(result.content)) if (key.includes("__i18n__")) delete result.content[key];
  return result;
}

/** Current MAPI is mandatory for executable proposals. Published-only mode is
 * explicitly hypothetical: no preimage, executable payload or approval exists. */
export function prepareBilingualBatch({ mapiStories = null, publishedStories, expectedPairs = 15,
  blackBoxApprovedPreimage = null, publishedOnly = false } = {}) {
  required(Array.isArray(publishedStories), "PUBLISHED_SNAPSHOT_REQUIRED");
  rejectCredentials(publishedStories);
  required(publishedOnly || Array.isArray(mapiStories), "CURRENT_MAPI_INVENTORY_REQUIRED");
  if (mapiStories) rejectCredentials(mapiStories);
  const pairs = pairPosts(publishedStories, expectedPairs);
  const baselineCatalog = buildEditorialCatalog({ stories: publishedStories,
    categories: publishedStories.filter((s) => s.content?.component === "Category") });
  const mapi = new Map((mapiStories || []).map((s) => [s.uuid, s]));
  required(!mapiStories || mapi.size === mapiStories.length, "DUPLICATE_MAPI_IDENTITY");
  const manifestPairs = [], futureStories = clone(publishedStories), spanishStories = [];
  const diagnostics = [];
  for (const { en: publicEn, es: publicEs } of pairs) {
    const issues = [], warnings = [];
    const add = (condition, code) => { if (!condition) issues.push(code); };
    const currentEn = publishedOnly ? null : mapi.get(publicEn.uuid);
    const currentEs = publishedOnly ? null : mapi.get(publicEs.uuid);
    const en = currentEn || publicEn, es = currentEs || publicEs;
    const existing = en.uuid === blackBoxUuid && !publishedOnly;
    if (publishedOnly) issues.push("CURRENT_MAPI_UNAVAILABLE");
    else {
      add(!!currentEn && !!currentEs, "MISSING_CURRENT_DRAFT");
      add(validIdentity(en) && validIdentity(es) && en.id === publicEn.id && es.id === publicEs.id &&
        en.slug === publicEn.slug && es.slug === publicEs.slug && reciprocal(en, es), "DRAFT_IDENTITY_OR_RELATION_CHANGED");
      add(en.published === true && es.published === true, "DRAFT_PUBLICATION_STATE_CHANGED");
      add(es.unpublished_changes === false, "PENDING_SPANISH_DRAFT");
      add(same(publicContent(es.content), publicEs.content), "SPANISH_DRAFT_DIFFERS_FROM_PUBLISHED");
      if (existing) {
        add(!!blackBoxApprovedPreimage && same(en, blackBoxApprovedPreimage), "BLACKBOX_APPROVED_PREIMAGE_CHANGED");
        add(en.unpublished_changes === true, "BLACKBOX_PENDING_STATE_CHANGED");
        add(en.content.es_translation_approved === true &&
          en.content.es_approved_hash === blackBoxApprovedPreimage?.content.es_approved_hash, "BLACKBOX_APPROVAL_CHANGED");
        add(calculateDraftEditorialApprovalHash(en) === en.content.es_approved_hash, "BLACKBOX_APPROVAL_STALE");
        const original = Object.fromEntries(Object.entries(en.content).filter(([key]) => !targetKeys.includes(key)));
        add(same(original, publicEn.content), "BLACKBOX_ORIGINAL_EN_CHANGED");
      } else {
        add(en.unpublished_changes === false, "PENDING_ENGLISH_DRAFT");
        add(same(publicContent(en.content), publicEn.content), "ENGLISH_DRAFT_DIFFERS_FROM_PUBLISHED");
        const existingLocalized = translatedKeys.filter((key) => Object.hasOwn(en.content, key));
        if (existingLocalized.length) warnings.push({ code: "EXISTING_NATIVE_FIELDS_REQUIRE_EXPLICIT_REPLACEMENT_REVIEW",
          keys: existingLocalized, replacePolicy: "legacy-es-is-canonical",
          differentFromSpanishReference: existingLocalized.filter((key) => en.content[key] !== es.content[key.split("__i18n__")[0]]),
          reviewedChanges: existingLocalized.filter((key) => en.content[key] !== es.content[key.split("__i18n__")[0]])
            .map((key) => ({ key, beforeSha256: canonicalHash(en.content[key]), afterSha256: canonicalHash(es.content[key.split("__i18n__")[0]]) })) });
        add(["slug_es", "es_translation_approved", "es_approved_hash"].every((key) => !Object.hasOwn(en.content, key)), "UNEXPECTED_EXISTING_APPROVAL_FIELDS");
      }
    }
    add(textFields.every((key) => nonblank(en.content[key]) && nonblank(es.content[key])), "INCOMPLETE_TEXT_FIELDS");
    add(same(en.content.date ?? null, es.content.date ?? null), "SPANISH_EDITORIAL_DATE_NOT_PRESERVED_BY_SHARED_FIELD");
    add(same(en.content.image ?? null, es.content.image ?? null), "SPANISH_IMAGES_NOT_PRESERVED_BY_SHARED_FIELD");
    const desired = clone(en);
    if (!existing) {
      for (const key of textFields) desired.content[`${key}__i18n__es_co`] = es.content[key];
      desired.content.slug_es = es.slug;
      desired.content.es_translation_approved = true;
      desired.content.es_approved_hash = calculateDraftEditorialApprovalHash(desired);
    }
    add(desired.content.slug_es === publicEs.slug, "LOCALIZED_SLUG_CHANGED");
    add(textFields.every((key) => desired.content[`${key}__i18n__es_co`] === es.content[key]), "SPANISH_TEXT_DIFFERS_FROM_REVIEW");
    add(/^[a-f0-9]{64}$/.test(desired.content.es_approved_hash || ""), "INVALID_REVIEW_HASH");
    const futureEn = stripNative(desired);
    const futureEs = clone(futureEn);
    futureEs.lang = "es-co";
    futureEs.full_slug = `es-co/${futureEn.full_slug}`;
    for (const key of textFields) futureEs.content[key] = es.content[key];
    const index = futureStories.findIndex((s) => s.uuid === publicEn.uuid);
    // These objects are a declared future publication simulation, never proof
    // of a real publication or a safe MAPI replacement.
    futureStories[index] = futureEn;
    spanishStories.push(futureEs);
    manifestPairs.push({ groupId: publicEn.group_id, enId: en.id, enUuid: en.uuid, esId: es.id, esUuid: es.uuid,
      enPath: `/posts/${publicEn.slug}`, esPath: `/es-co/posts/${publicEs.slug}`,
      existingApprovedDraft: existing, draftStateVerified: !publishedOnly && !!currentEn && !!currentEs,
      editorialHash: desired.content.es_approved_hash,
      humanApprovalGrantedForNewProposal: false, issues, warnings,
      preimages: publishedOnly ? null : { en: clone(en), es: clone(es) },
      preconditions: publishedOnly ? null : { en: precondition(en), es: precondition(es) },
      proposedContent: publishedOnly ? null : clone(desired.content),
      saveOperation: publishedOnly || existing || issues.length ? null : {
        operation: "updateStory", parameters: { space_id: 1023389, id: en.id, publish: false, force_update: false,
          story: { content: clone(desired.content) } } },
      publishOperation: publishedOnly || issues.length ? null : { operation: "publishStory", parameters: { space_id: 1023389, id: en.id } },
      rollback: { preferred: "MODEL_OFF_REBUILD_AND_DEPLOY_ONLY_AFTER_AUTHORIZATION", spanishLegacyReadOnly: true,
        neverUnpublishOrDelete: true, contentRestoreRequiresFreshReadAndSeparateAuthorization: true },
    });
  }
  required(new Set(manifestPairs.map((p) => p.enPath)).size === expectedPairs &&
    new Set(manifestPairs.map((p) => p.esPath)).size === expectedPairs, "DUPLICATE_HISTORICAL_ROUTE");
  const catalog = buildEditorialCatalog({ stories: futureStories, spanishStories,
    categories: publishedStories.filter((s) => s.content?.component === "Category") });
  diagnostics.push(...catalog.diagnostics);
  for (const pair of manifestPairs) {
    const projected = catalog.entries.find((e) => e.href === pair.esPath);
    const legacy = baselineCatalog.entries.find((entry) => entry.href === pair.esPath);
    if (projected?.model !== "field" || projected.uuid !== pair.enUuid) pair.issues.push("FUTURE_IDENTITY_NOT_ADOPTED");
    if ((projected?.categoryUuid ?? null) !== (legacy?.categoryUuid ?? null)) pair.issues.push("SPANISH_CATEGORY_NOT_PRESERVED");
    if (pair.issues.length) { pair.saveOperation = null; pair.publishOperation = null; }
    pair.status = pair.issues.length ? "BLOCKED" : pair.existingApprovedDraft ? "EXISTING_APPROVED_DRAFT" : "PREPARED_REQUIRES_BATCH_APPROVAL";
  }
  const blockers = [...new Set([...manifestPairs.flatMap((p) => p.issues), ...diagnostics])];
  const manifest = { schema: 1, kind: "bilingual-migration-preparation", spaceId: 1023389, region: "us",
    currentDraftsVerified: !publishedOnly, remoteMutationAuthorized: false, remotelyExecuted: false,
    sourceKind: publishedOnly ? "published-only-provisional" : "current-mapi-and-published-cda",
    readyPairs: manifestPairs.filter((p) => !p.issues.length).length, blockedPairs: manifestPairs.filter((p) => p.issues.length).length,
    historicalUrls: manifestPairs.flatMap((p) => [p.enPath, p.esPath]).sort(), pairs: manifestPairs,
    publicationBaseline: clone(publishedStories.filter((s) => s.content?.component === "post")),
    categoryBaseline: clone(publishedStories.filter((s) => s.content?.component === "Category")),
    blockers, diagnostics,
    replacementReview: { policy: "legacy-es-is-canonical", explicitBatchAcknowledgementRequired: true,
      records: manifestPairs.filter((p) => p.warnings.some((w) => w.differentFromSpanishReference?.length)).length,
      fields: manifestPairs.flatMap((p) => p.warnings).reduce((sum, w) => sum + (w.differentFromSpanishReference?.length || 0), 0) },
    activationPrerequisite: { productionCurrentlyHardBlocked: true, patchApplicationAndValidationRequired: true,
      featureDefaultOff: true, previewBeforeProduction: true },
    plannedOperations: { saves: manifestPairs.filter((p) => p.saveOperation).length,
      publishes: manifestPairs.filter((p) => p.publishOperation).length, spanishWrites: 0 },
    status: blockers.length ? "BLOCKED" : "PREPARED_REQUIRES_BATCH_AUTHORIZATION" };
  manifest.manifestId = canonicalHash(manifest);
  return { manifest, simulation: { schema: 1, sourceKind: "future-consolidation-simulation",
    managementWritePayload: false, realPublicationObserved: false, draftStateVerified: !publishedOnly,
    baselineStories: clone(publishedStories), stories: futureStories, spanishStories,
    pairs: manifestPairs.map((p) => ({ enUuid: p.enUuid, esUuid: p.esUuid, esLegacyUuid: p.esUuid,
      enPath: p.enPath, esPath: p.esPath, groupId: p.groupId })) } };
}

export function verifyManifest(manifest) {
  const { manifestId, ...body } = manifest;
  required(manifestId === canonicalHash(body), "MANIFEST_CHANGED");
  required(manifest.kind === "bilingual-migration-preparation" && manifest.schema === 1, "INVALID_MANIFEST");
  return true;
}
export const newBatchLedger = (manifest) => { verifyManifest(manifest); return { schema: 1, manifestId: manifest.manifestId, events: [] }; };
function checkLedger(manifest, ledger) {
  verifyManifest(manifest);
  required(ledger?.schema === 1 && ledger.manifestId === manifest.manifestId && Array.isArray(ledger.events), "LEDGER_MANIFEST_MISMATCH");
  const attempts = new Set();
  for (const event of ledger.events) {
    required(["attempting", "verified", "failed", "uncertain"].includes(event.status), "INVALID_LEDGER_EVENT");
    if (event.status === "attempting") { required(!attempts.has(event.actionId), "DUPLICATE_MUTATION_ATTEMPT"); attempts.add(event.actionId); }
    else required(attempts.has(event.actionId), "RECEIPT_WITHOUT_ATTEMPT");
  }
}
/** Returns one operation for an authorized external MCP operator. This function
 * never invokes it. A failed/uncertain attempt cannot become a new mutation. */
export function nextBatchAction(manifest, ledger) {
  checkLedger(manifest, ledger);
  if (manifest.status !== "PREPARED_REQUIRES_BATCH_AUTHORIZATION") return { kind: "blocked", blockers: manifest.blockers };
  const unresolved = ledger.events.find((event) => event.status === "attempting" &&
    !ledger.events.some((e) => e.actionId === event.actionId && e.status === "verified"));
  if (unresolved) return { kind: "reconcile-readonly", actionId: unresolved.actionId, noAutomaticRetry: true };
  const done = (id) => ledger.events.some((event) => event.actionId === id && event.status === "verified");
  for (const pair of manifest.pairs) if (pair.saveOperation && !done(`save:${pair.enUuid}`)) {
    return { kind: "save", actionId: `save:${pair.enUuid}`, enUuid: pair.enUuid, operation: clone(pair.saveOperation), requiresFreshEnAndEsRead: true };
  }
  const publicationOrder = [...manifest.pairs].sort((a, b) => Number(b.existingApprovedDraft) - Number(a.existingApprovedDraft) || a.enUuid.localeCompare(b.enUuid));
  for (const pair of publicationOrder) if (!done(`publish:${pair.enUuid}`)) {
    return { kind: "publish", actionId: `publish:${pair.enUuid}`, enUuid: pair.enUuid, operation: clone(pair.publishOperation), requiresFreshEnAndEsRead: true };
  }
  return { kind: "verify-batch-and-preview", requiresAllPublishedCdaVerified: true, productionMutationAllowed: false };
}
export function beginBatchAction(manifest, ledger, fresh, { batchAuthorized = false, replacementsAcknowledged = false } = {}) {
  required(batchAuthorized === true, "EXPLICIT_BATCH_AUTHORIZATION_REQUIRED");
  required(manifest.replacementReview.fields === 0 || replacementsAcknowledged === true, "EXPLICIT_NATIVE_REPLACEMENT_REVIEW_REQUIRED");
  const action = nextBatchAction(manifest, ledger);
  required(["save", "publish"].includes(action.kind), "NO_MUTATION_AVAILABLE");
  const pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  const expected = action.kind === "save" || pair.existingApprovedDraft ? pair.preimages.en :
    ledger.events.find((event) => event.actionId === `save:${pair.enUuid}` && event.status === "verified").postEn;
  required(same(fresh.en, expected) && same(fresh.es, pair.preimages.es), "CONCURRENT_CONTENT_OR_METADATA_CHANGE");
  const result = clone(ledger);
  result.events.push({ actionId: action.actionId, status: "attempting", beforeEnHash: canonicalHash(fresh.en), beforeEsHash: canonicalHash(fresh.es) });
  return { ledger: result, action };
}
function checkCdaIdentity(pair, en, es) {
  return en?.id === pair.enId && en.uuid === pair.enUuid && en.full_slug === pair.enPath.slice(1) &&
    es?.id === pair.enId && es.uuid === pair.enUuid && es.slug === en.slug && es.full_slug === `es-co/${en.full_slug}`;
}
export function recordBatchOutcome(manifest, ledger, actionId, evidence) {
  checkLedger(manifest, ledger);
  required(ledger.events.some((event) => event.actionId === actionId && event.status === "attempting"), "ATTEMPT_REQUIRED");
  required(!ledger.events.some((event) => event.actionId === actionId && event.status === "verified"), "ALREADY_VERIFIED_NO_DUPLICATE");
  const kind = actionId.split(":")[0], uuid = actionId.slice(kind.length + 1);
  const pair = manifest.pairs.find((p) => p.enUuid === uuid);
  required(pair && ["save", "publish"].includes(kind), "INVALID_ACTION_TARGET");
  const result = clone(ledger);
  if (evidence.outcome !== "observed-success") {
    required(["failed", "uncertain"].includes(evidence.outcome), "INVALID_OUTCOME");
    result.events.push({ actionId, status: evidence.outcome });
    return result;
  }
  const { postEn, postEs } = evidence;
  required(postEn?.id === pair.enId && postEn.uuid === pair.enUuid && same(postEn.content, pair.proposedContent), "POST_CONTENT_OR_IDENTITY_MISMATCH");
  required(same(postEs, pair.preimages.es), "SPANISH_LEGACY_CHANGED");
  const priorVerifiedSave = ledger.events.find((event) => event.actionId === `save:${pair.enUuid}` && event.status === "verified");
  const before = kind === "save" || pair.existingApprovedDraft ? pair.preimages.en : priorVerifiedSave?.postEn;
  required(before, "VERIFIED_SAVE_PREIMAGE_REQUIRED");
  const automatic = new Set(["content", "updated_at", "current_version_id", "unpublished_changes", ...(kind === "publish" ? ["published_at"] : [])]);
  for (const key of new Set([...Object.keys(before), ...Object.keys(postEn)])) {
    if (!automatic.has(key)) required(Object.hasOwn(before, key) === Object.hasOwn(postEn, key) && same(postEn[key], before[key]), "UNEXPECTED_POST_METADATA_CHANGE");
  }
  required(postEn.published === true && postEn.unpublished_changes === (kind === "save"), "POST_PUBLICATION_STATE_MISMATCH");
  required(calculateDraftEditorialApprovalHash(postEn) === pair.editorialHash, "POST_APPROVAL_STALE");
  const en = evidence.cdaEn, es = evidence.cdaEs;
  required(checkCdaIdentity(pair, en, es), "CDA_IDENTITY_MISMATCH");
  const withoutEditable = (content) => Object.fromEntries(Object.entries(content).filter(([key]) => key !== "_editable"));
  required(same(withoutEditable(en.content), publicContent(pair.proposedContent)), "CDA_ENGLISH_SHARED_FIELDS_CHANGED");
  for (const [key, value] of Object.entries(publicContent(pair.proposedContent))) {
    if (!textFields.includes(key) && key !== "category_ref") required(same(es.content[key], value), "CDA_SPANISH_SHARED_FIELDS_CHANGED");
  }
  required((es.content.category_ref?.id ?? null) === (en.content.category_ref?.id ?? null), "CDA_SPANISH_CATEGORY_ID_CHANGED");
  required(en.content.es_translation_approved === true && es.content.es_translation_approved === true &&
    en.content.es_approved_hash === pair.editorialHash && es.content.es_approved_hash === pair.editorialHash &&
    calculateEditorialApprovalHash(en, es.content) === pair.editorialHash, "CDA_APPROVAL_MISMATCH");
  if (kind === "save") {
    required(evidence.cdaVersion === "draft" && Array.isArray(evidence.publicPublishedStories), "DRAFT_AND_PUBLIC_RECEIPTS_REQUIRED");
    for (const original of [pair.preimages.en, pair.preimages.es]) {
      const visible = evidence.publicPublishedStories.find((s) => s.uuid === original.uuid);
      const baseline = manifest.publicationBaseline?.find((s) => s.uuid === original.uuid);
      required(baseline && visible && same(visible.content, baseline.content) && visible.id === baseline.id &&
        visible.full_slug === baseline.full_slug && visible.published_at === baseline.published_at &&
        visible.first_published_at === baseline.first_published_at, "PUBLICATION_CHANGED_DURING_DRAFT_SAVE");
    }
    required(postEn.published_at === pair.preimages.en.published_at &&
      postEn.first_published_at === pair.preimages.en.first_published_at, "PUBLICATION_TIMESTAMP_CHANGED_DURING_SAVE");
  } else {
    required(evidence.cdaVersion === "published", "PUBLISHED_CDA_RECEIPT_REQUIRED");
    required(en.published_at === postEn.published_at && es.published_at === postEn.published_at &&
      en.first_published_at === postEn.first_published_at && es.first_published_at === postEn.first_published_at,
    "PUBLISHED_CDA_METADATA_MISMATCH");
    required(Array.isArray(evidence.publicPublishedStories), "LEGACY_ES_PUBLISHED_RECEIPT_REQUIRED");
    const legacy = evidence.publicPublishedStories.find((story) => story.uuid === pair.esUuid);
    const baseline = manifest.publicationBaseline.find((story) => story.uuid === pair.esUuid);
    required(legacy && same(legacy.content, baseline.content) && legacy.id === baseline.id &&
      legacy.full_slug === baseline.full_slug && legacy.published_at === baseline.published_at &&
      legacy.first_published_at === baseline.first_published_at, "LEGACY_ES_PUBLICATION_CHANGED");
  }
  result.events.push({ actionId, status: "verified", postEn: clone(postEn), evidenceHash: canonicalHash(evidence) });
  return result;
}

/** Final read-only batch gate. Per-item receipts cannot authorize a Preview
 * until one current published catalogue independently covers the whole batch. */
export function verifyPublishedBatch(manifest, ledger, { stories, spanishStories } = {}) {
  required(nextBatchAction(manifest, ledger).kind === "verify-batch-and-preview", "ALL_PUBLICATIONS_MUST_BE_VERIFIED");
  required(Array.isArray(stories) && Array.isArray(spanishStories), "COMPLETE_PUBLISHED_CDA_REQUIRED");
  rejectCredentials(stories); rejectCredentials(spanishStories);
  const categories = stories.filter((s) => s.content?.component === "Category");
  const catalog = buildEditorialCatalog({ stories, spanishStories, categories });
  required(catalog.diagnostics.length === 0, "PUBLISHED_BATCH_DIAGNOSTICS");
  required(same(catalog.entries.map((entry) => entry.href).sort(), manifest.historicalUrls), "PUBLISHED_HISTORICAL_URL_SET_CHANGED");
  required(catalog.entries.every((entry) => entry.model === "field") &&
    new Set(catalog.entries.map((entry) => entry.uuid)).size === manifest.pairs.length, "PUBLISHED_PRIMARY_IDENTITIES_CHANGED");
  const priorCategories = manifest.categoryBaseline || [];
  const categoryView = (values) => values.map((s) => Object.fromEntries(["id", "uuid", "slug", "full_slug", "group_id", "alternates", "content"].map((key) => [key, s[key] ?? null]))).sort((a, b) => a.uuid.localeCompare(b.uuid));
  required(same(categoryView(categories), categoryView(priorCategories)), "PUBLISHED_CATEGORIES_CHANGED");
  for (const pair of manifest.pairs) {
    const en = stories.find((s) => s.uuid === pair.enUuid), es = stories.find((s) => s.uuid === pair.esUuid);
    const baselineEs = manifest.publicationBaseline.find((s) => s.uuid === pair.esUuid);
    required(en && same(en.content, publicContent(pair.proposedContent)) && en.content.es_translation_approved === true &&
      en.content.es_approved_hash === pair.editorialHash, "PUBLISHED_PRIMARY_CONTENT_CHANGED");
    required(es && same(es.content, baselineEs.content) && es.id === baselineEs.id && es.full_slug === baselineEs.full_slug &&
      es.published_at === baselineEs.published_at && es.first_published_at === baselineEs.first_published_at, "PUBLISHED_LEGACY_ES_CHANGED");
    required(catalog.entries.filter((entry) => entry.uuid === pair.enUuid).length === 2 &&
      catalog.entries.find((entry) => entry.href === pair.enPath)?.uuid === pair.enUuid &&
      catalog.entries.find((entry) => entry.href === pair.esPath)?.uuid === pair.enUuid, "PUBLISHED_PAIR_IDENTITY_CHANGED");
  }
  return { status: "PASS", gate: "PREVIEW_CANDIDATE_ONLY", productionMutationAllowed: false,
    historicalUrls: catalog.entries.length, primaryIdentities: manifest.pairs.length,
    manifestId: manifest.manifestId, evidenceHash: canonicalHash({ stories, spanishStories }) };
}

function outside(path) { return path !== repository.slice(0, -1) && !path.startsWith(repository); }
export async function readPrivateBatchJson(path) {
  required(isAbsolute(path || ""), "PRIVATE_ABSOLUTE_PATH_REQUIRED");
  required(outside(resolve(path)), "PRIVATE_DATA_MUST_STAY_OUTSIDE_REPOSITORY");
  const actual = await realpath(path);
  required(outside(actual), "PRIVATE_DATA_MUST_STAY_OUTSIDE_REPOSITORY");
  required(((await stat(actual)).mode & 0o077) === 0, "PRIVATE_FILE_PERMISSIONS_REQUIRED");
  return JSON.parse(await readFile(actual, "utf8"));
}
export async function createPrivateBatchDirectory(path) {
  required(isAbsolute(path || ""), "PRIVATE_OUTPUT_ABSOLUTE_PATH_REQUIRED");
  required(outside(resolve(path)), "PRIVATE_OUTPUT_MUST_STAY_OUTSIDE_REPOSITORY");
  let parent = resolve(path);
  while (!existsSync(parent)) parent = dirname(parent);
  required(outside(await realpath(parent)), "PRIVATE_OUTPUT_MUST_STAY_OUTSIDE_REPOSITORY");
  await mkdir(path, { recursive: true, mode: 0o700 }); await chmod(path, 0o700);
  const actual = await realpath(path); required(outside(actual), "PRIVATE_OUTPUT_MUST_STAY_OUTSIDE_REPOSITORY"); return actual;
}
const readPrivate = readPrivateBatchJson;
const privateDirectory = createPrivateBatchDirectory;
const storiesOf = (value) => Array.isArray(value) ? value : value.stories ?? value.data?.stories;
async function main(args) {
  process.umask(0o077);
  const command = args.shift(), options = {};
  while (args.length) { const key = args.shift(); required(key.startsWith("--"), "INVALID_ARGUMENT"); options[key.slice(2)] = key === "--published-only" ? true : args.shift(); }
  if (command === "prepare") {
    const published = await readPrivate(options.published);
    required(published.version === "published" && published.sourceKind === "cda-published-snapshot", "DECLARED_PUBLISHED_SNAPSHOT_REQUIRED");
    const mapi = options.mapi ? await readPrivate(options.mapi) : null;
    required(options["published-only"] === true || (mapi?.verifiedCurrent === true && mapi.sourceKind === "mapi-editable-inventory"), "DECLARED_CURRENT_MAPI_REQUIRED");
    const blackbox = options.blackbox ? await readPrivate(options.blackbox) : null;
    const { manifest, simulation } = prepareBilingualBatch({ publishedStories: storiesOf(published),
      mapiStories: mapi ? storiesOf(mapi) : null, blackBoxApprovedPreimage: blackbox?.story ?? blackbox,
      publishedOnly: options["published-only"] === true });
    const output = await privateDirectory(options.output);
    for (const [name, data] of [["migration-manifest.json", manifest], ["publication-simulation.json", simulation],
      ["review-summary.json", { manifestId: manifest.manifestId, status: manifest.status, readyPairs: manifest.readyPairs,
        blockedPairs: manifest.blockedPairs, blockers: manifest.blockers, plannedOperations: manifest.plannedOperations,
        pairs: manifest.pairs.map((p) => ({ enId: p.enId, esId: p.esId, enPath: p.enPath, esPath: p.esPath,
          editorialHash: p.editorialHash, status: p.status, issues: p.issues })) }], ["ledger.json", newBatchLedger(manifest)]]) {
      await writeFile(join(output, name), JSON.stringify(data, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    }
    console.log(JSON.stringify({ status: manifest.status, readyPairs: manifest.readyPairs, blockedPairs: manifest.blockedPairs, output, remoteOperations: 0 }));
  } else if (command === "verify") {
    const manifest = await readPrivate(options.manifest); verifyManifest(manifest);
    console.log(JSON.stringify({ manifestId: manifest.manifestId, integrity: "PASS", preparationStatus: manifest.status }));
  } else if (command === "next-action") {
    const action = nextBatchAction(await readPrivate(options.manifest), await readPrivate(options.ledger));
    // Do not print editorial bodies from a planned operation into terminal logs.
    console.log(JSON.stringify({ kind: action.kind, actionId: action.actionId, enUuid: action.enUuid,
      blockers: action.blockers, noAutomaticRetry: action.noAutomaticRetry, productionMutationAllowed: false }));
  } else if (command === "begin") {
    const result = beginBatchAction(await readPrivate(options.manifest), await readPrivate(options.ledger),
      await readPrivate(options.fresh), { batchAuthorized: options.authorized === "yes",
        replacementsAcknowledged: options["acknowledge-replacements"] === "yes" });
    const output = await privateDirectory(options.output);
    await writeFile(join(output, "ledger.json"), JSON.stringify(result.ledger, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    await writeFile(join(output, "action-private.json"), JSON.stringify(result.action, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ kind: result.action.kind, actionId: result.action.actionId, output, remoteOperations: 0 }));
  } else if (command === "record") {
    const manifest = await readPrivate(options.manifest);
    const ledger = recordBatchOutcome(manifest, await readPrivate(options.ledger), options.action, await readPrivate(options.evidence));
    const actual = resolve(options["out-ledger"] || "");
    required(isAbsolute(options["out-ledger"] || ""), "PRIVATE_LEDGER_ABSOLUTE_PATH_REQUIRED");
    await privateDirectory(dirname(actual));
    await writeFile(actual, JSON.stringify(ledger, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ actionId: options.action, status: ledger.events.at(-1).status, output: actual, remoteOperations: 0 }));
  } else if (command === "verify-published") {
    const evidence = await readPrivate(options.evidence);
    required(evidence.version === "published" && evidence.sourceKind === "cda-published-batch", "DECLARED_PUBLISHED_BATCH_REQUIRED");
    console.log(JSON.stringify(verifyPublishedBatch(await readPrivate(options.manifest), await readPrivate(options.ledger), evidence)));
  } else throw new Error("SUPPORTED_COMMANDS_PREPARE_VERIFY_NEXT_ACTION_BEGIN_RECORD_VERIFY_PUBLISHED");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(/^[A-Z0-9_]+$/.test(error.message || "") ? error.message : "BATCH_PREPARATION_FAILED"); process.exitCode = 1; });
}
