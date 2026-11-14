import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, chmod, symlink, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  prepareBilingualBatch, canonicalHash, verifyManifest, newBatchLedger,
  nextBatchAction, beginBatchAction, recordBatchOutcome,
  readPrivateBatchJson, createPrivateBatchDirectory,
  verifyPublishedBatch,
} from "../scripts/pilots/bilingual-batch.mjs";
import { calculateDraftEditorialApprovalHash } from "../lib/editorial-catalog.ts";

const clone = (v) => structuredClone(v);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture(count = 15, { existingBlackBox = true } = {}) {
  const created = "2025-01-01T00:00:00.000Z";
  const categoryEn = { id: 10, uuid: uuid(10), slug: "synthetic-category", full_slug: "categories/synthetic-category",
    group_id: "synthetic-category-pair", published: true, published_at: created,
    content: { component: "Category", language: "english", title: "Synthetic category" } };
  const categoryEs = { ...clone(categoryEn), id: 11, uuid: uuid(11), slug: "categoria-sintetica", full_slug: "categories/categoria-sintetica",
    content: { component: "Category", language: "spanish", title: "Categoría sintética" } };
  const link = (a, b) => { a.alternates = [{ id: b.id, full_slug: b.full_slug, published: true }]; b.alternates = [{ id: a.id, full_slug: a.full_slug, published: true }]; };
  link(categoryEn, categoryEs);
  const publishedStories = [categoryEn, categoryEs];
  for (let n = 0; n < count; n++) {
    const en = { id: 1000 + n * 2, uuid: uuid(1000 + n * 2), name: `Synthetic EN ${n}`, slug: `synthetic-en-${n}`,
      full_slug: `posts/synthetic-en-${n}`, group_id: `synthetic-pair-${n}`, published: true, unpublished_changes: false,
      first_published_at: created, published_at: created, updated_at: created, current_version_id: null,
      content: { _uid: uuid(2000 + n), component: "post", language: "english", title: `Synthetic English ${n}`,
        intro: `Synthetic introduction ${n}`, content: `## Synthetic body ${n}\n\nExact Markdown.`,
        date: "2025-01-01 00:00", image: [], category_ref: { id: categoryEn.uuid, cached_url: categoryEn.full_slug } } };
    const es = { ...clone(en), id: en.id + 1, uuid: uuid(en.id + 1), name: `Synthetic ES ${n}`, slug: `sintetico-es-${n}`,
      full_slug: `posts/sintetico-es-${n}`, content: { ...clone(en.content), language: "spanish", title: `Español sintético ${n}`,
        intro: `Introducción sintética ${n}`, content: `## Cuerpo sintético ${n}\n\nMarkdown exacto.`,
        category_ref: { id: categoryEs.uuid, cached_url: categoryEs.full_slug } } };
    if (n === 0 && existingBlackBox) en.uuid = "6bffd408-51d4-403b-a64a-cd22e3c3e287";
    link(en, es); publishedStories.push(en, es);
  }
  const mapiStories = clone(publishedStories.filter((s) => s.content.component === "post"));
  let blackBoxApprovedPreimage = null;
  if (existingBlackBox) {
    const en = mapiStories[0], es = mapiStories[1];
    for (const key of ["title", "intro", "content"]) en.content[`${key}__i18n__es_co`] = es.content[key];
    en.content.slug_es = es.slug; en.content.es_translation_approved = true;
    en.content.es_approved_hash = calculateDraftEditorialApprovalHash(en); en.unpublished_changes = true;
    en.current_version_id = 20001; en.updated_at = "2026-01-01T00:00:00.000Z";
    blackBoxApprovedPreimage = clone(en);
  }
  return { publishedStories, mapiStories, blackBoxApprovedPreimage, expectedPairs: count };
}
function prepared(options = {}) { return prepareBilingualBatch(fixture(15, options)); }
function reseal(manifest) { delete manifest.manifestId; manifest.manifestId = canonicalHash(manifest); return manifest; }
function cdaPair(pair, content) {
  const en = { ...clone(pair.preimages.en), content: clone(content) };
  for (const key of Object.keys(en.content)) if (key.includes("__i18n__")) delete en.content[key];
  const es = clone(en); es.full_slug = `es-co/${en.full_slug}`; es.lang = "es-co";
  for (const key of ["title", "intro", "content"]) es.content[key] = content[`${key}__i18n__es_co`];
  return { en, es };
}
function savedEvidence(manifest, action) {
  const pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  const postEn = { ...clone(pair.preimages.en), content: clone(pair.proposedContent), unpublished_changes: true,
    updated_at: "2026-02-01T00:00:00.000Z", current_version_id: 30001 };
  const cda = cdaPair(pair, pair.proposedContent);
  return { outcome: "observed-success", postEn, postEs: clone(pair.preimages.es), cdaEn: cda.en, cdaEs: cda.es,
    cdaVersion: "draft", publicPublishedStories: clone(manifest.publicationBaseline) };
}
function fullyPublished() {
  const preparation = prepared(), { manifest } = preparation; let ledger = newBatchLedger(manifest);
  while (["save", "publish"].includes(nextBatchAction(manifest, ledger).kind)) {
    const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
    const prior = action.kind === "save" || pair.existingApprovedDraft ? pair.preimages.en :
      ledger.events.find((event) => event.actionId === `save:${pair.enUuid}` && event.status === "verified").postEn;
    ledger = beginBatchAction(manifest, ledger, { en: prior, es: pair.preimages.es }, { batchAuthorized: true }).ledger;
    const evidence = savedEvidence(manifest, action);
    if (action.kind === "publish") {
      evidence.postEn.unpublished_changes = false;
      evidence.postEn.published_at = "2026-03-01T00:00:00.000Z";
      evidence.cdaEn.published_at = evidence.postEn.published_at;
      evidence.cdaEs.published_at = evidence.postEn.published_at;
      evidence.cdaVersion = "published";
    }
    ledger = recordBatchOutcome(manifest, ledger, action.actionId, evidence);
  }
  const evidence = { stories: preparation.simulation.stories, spanishStories: preparation.simulation.spanishStories };
  return { manifest, ledger, evidence };
}
test("batch prepares fifteen identities and thirty historical URLs with fourteen save proposals", () => {
  const { manifest, simulation } = prepared();
  assert.equal(manifest.status, "PREPARED_REQUIRES_BATCH_AUTHORIZATION");
  assert.equal(manifest.readyPairs, 15); assert.equal(manifest.blockedPairs, 0);
  assert.equal(manifest.historicalUrls.length, 30); assert.equal(new Set(manifest.historicalUrls).size, 30);
  assert.deepEqual(manifest.plannedOperations, { saves: 14, publishes: 15, spanishWrites: 0 });
  assert.equal(manifest.remoteMutationAuthorized, false);
  assert.equal(simulation.realPublicationObserved, false); assert.equal(simulation.managementWritePayload, false);
  assert.equal(new Set(simulation.pairs.map((p) => p.enUuid)).size, 15);
});
test("Black-Box approved draft is preserved verbatim and has no save operation", () => {
  const input = fixture(); const { manifest } = prepareBilingualBatch(input);
  const existing = manifest.pairs.find((p) => p.existingApprovedDraft);
  assert.equal(existing.saveOperation, null);
  assert.deepEqual(existing.proposedContent, input.blackBoxApprovedPreimage.content);
});
test("tampered Black-Box draft blocks reuse instead of reconstructing it", () => {
  const input = fixture(); input.mapiStories[0].content.intro += " changed";
  const { manifest } = prepareBilingualBatch(input);
  assert.ok(manifest.blockers.includes("BLACKBOX_APPROVED_PREIMAGE_CHANGED"));
  assert.equal(nextBatchAction(manifest, newBatchLedger(manifest)).kind, "blocked");
});
test("pairing requires reciprocal published alternates and group identity", () => {
  const input = fixture(); input.publishedStories[2].alternates[0].id = 999;
  assert.throws(() => prepareBilingualBatch(input), /NONRECIPROCAL_LANGUAGE_PAIR/);
});
test("missing or duplicate identity fails the complete batch", () => {
  const input = fixture(); input.publishedStories[2].uuid = input.publishedStories[3].uuid;
  assert.throws(() => prepareBilingualBatch(input), /DUPLICATE_IDENTITY/);
  assert.throws(() => prepareBilingualBatch({ ...fixture(), publishedStories: [] }), /PUBLISHED_POST_COUNT_CHANGED/);
});
test("partial or malformed translated slugs never become a payload", () => {
  const input = fixture(); input.publishedStories[5].slug = "../malicious";
  assert.throws(() => prepareBilingualBatch(input), /INVALID_HISTORICAL_PATH_OR_IDENTITY/);
});
test("unexpected draft text and pending Spanish work block without overwriting", () => {
  const input = fixture(); input.mapiStories[3].content.content += " pending"; input.mapiStories[3].unpublished_changes = true;
  const { manifest } = prepareBilingualBatch(input);
  assert.ok(manifest.blockers.includes("PENDING_SPANISH_DRAFT"));
  assert.ok(manifest.blockers.includes("SPANISH_DRAFT_DIFFERS_FROM_PUBLISHED"));
  assert.equal(manifest.pairs.find((p) => p.esId === input.mapiStories[3].id).saveOperation, null);
});
test("shared date or images cannot silently replace different Spanish visible fields", () => {
  const input = fixture(); input.mapiStories[3].content.date = "2020-01-01";
  input.publishedStories[5].content.date = "2020-01-01";
  const { manifest } = prepareBilingualBatch(input);
  assert.ok(manifest.blockers.includes("SPANISH_EDITORIAL_DATE_NOT_PRESERVED_BY_SHARED_FIELD"));
});
test("uncategorized legacy pairs retain null category without a fabricated category blocker", () => {
  const input = fixture();
  for (const s of [...input.mapiStories, ...input.publishedStories.filter((s) => s.content.component === "post")]) s.content.category_ref = { id: "", cached_url: "" };
  input.mapiStories[0].content.es_approved_hash = calculateDraftEditorialApprovalHash(input.mapiStories[0]);
  input.blackBoxApprovedPreimage = clone(input.mapiStories[0]);
  assert.equal(prepareBilingualBatch(input).manifest.readyPairs, 15);
});
test("published default CDA omits raw native keys without proving draft divergence", () => {
  const input = fixture();
  input.mapiStories[2].content.title__i18n__es_co = "Earlier reviewed translation";
  input.mapiStories[3].content.title__i18n__es_co = "Existing native ES value";
  const { manifest } = prepareBilingualBatch(input);
  assert.equal(manifest.readyPairs, 15);
  assert.deepEqual(manifest.replacementReview, { policy: "legacy-es-is-canonical", explicitBatchAcknowledgementRequired: true, records: 1, fields: 1 });
  const pair = manifest.pairs.find((p) => p.enId === input.mapiStories[2].id);
  assert.equal(pair.proposedContent.title__i18n__es_co, input.mapiStories[3].content.title);
  assert.equal(pair.preimages.en.content.title__i18n__es_co, "Earlier reviewed translation");
});
test("provisional published-only mode has zero executable operations and no invented MAPI preimage", () => {
  const input = fixture(); const { manifest } = prepareBilingualBatch({ publishedStories: input.publishedStories, publishedOnly: true });
  assert.equal(manifest.readyPairs, 0); assert.equal(manifest.currentDraftsVerified, false);
  assert.equal(manifest.sourceKind, "published-only-provisional");
  assert.ok(manifest.pairs.every((p) => !p.preimages && !p.saveOperation && !p.publishOperation));
  assert.equal(nextBatchAction(manifest, newBatchLedger(manifest)).kind, "blocked");
});
test("no current MAPI input fails instead of silently using published snapshots", () => {
  assert.throws(() => prepareBilingualBatch({ publishedStories: fixture().publishedStories }), /CURRENT_MAPI_INVENTORY_REQUIRED/);
});
test("selected credential fields are rejected before private output", () => {
  const input = fixture(); input.mapiStories[0].preview_token = "not-a-real-token";
  assert.throws(() => prepareBilingualBatch(input), /CREDENTIAL_FIELD_FORBIDDEN/);
});
test("manifest digest detects changed operations and ledger cannot cross candidates", () => {
  const { manifest } = prepared(); const ledger = newBatchLedger(manifest);
  manifest.pairs[0].editorialHash = "a".repeat(64);
  assert.throws(() => verifyManifest(manifest), /MANIFEST_CHANGED/);
  const other = prepared().manifest; other.activationPrerequisite.previewBeforeProduction = false; reseal(other);
  assert.throws(() => nextBatchAction(other, ledger), /LEDGER_MANIFEST_MISMATCH/);
});
test("starting even the first future mutation requires explicit batch authorization", () => {
  const { manifest } = prepared(); const ledger = newBatchLedger(manifest);
  const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  assert.throws(() => beginBatchAction(manifest, ledger, { en: pair.preimages.en, es: pair.preimages.es }), /EXPLICIT_BATCH_AUTHORIZATION_REQUIRED/);
});
test("existing native replacements require one explicit batch acknowledgement", () => {
  const input = fixture(); input.mapiStories[2].content.title__i18n__es_co = "Different earlier native value";
  const { manifest } = prepareBilingualBatch(input), ledger = newBatchLedger(manifest);
  const pair = manifest.pairs.find((p) => p.enUuid === nextBatchAction(manifest, ledger).enUuid);
  assert.throws(() => beginBatchAction(manifest, ledger, { en: pair.preimages.en, es: pair.preimages.es }, { batchAuthorized: true }), /EXPLICIT_NATIVE_REPLACEMENT_REVIEW_REQUIRED/);
});
test("fresh concurrency check includes complete fields, updated_at and current_version_id", () => {
  const { manifest } = prepared(); const ledger = newBatchLedger(manifest);
  const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  const en = clone(pair.preimages.en); en.current_version_id = 1234;
  assert.throws(() => beginBatchAction(manifest, ledger, { en, es: pair.preimages.es }, { batchAuthorized: true }), /CONCURRENT_CONTENT_OR_METADATA_CHANGE/);
});
test("uncertain outcome creates a read-only reconciliation gate and never retries the write", () => {
  const { manifest } = prepared(), ledger = newBatchLedger(manifest);
  const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  const begun = beginBatchAction(manifest, ledger, { en: pair.preimages.en, es: pair.preimages.es }, { batchAuthorized: true });
  const uncertain = recordBatchOutcome(manifest, begun.ledger, action.actionId, { outcome: "uncertain" });
  assert.equal(nextBatchAction(manifest, uncertain).kind, "reconcile-readonly");
  assert.throws(() => beginBatchAction(manifest, uncertain, { en: pair.preimages.en, es: pair.preimages.es }, { batchAuthorized: true }), /NO_MUTATION_AVAILABLE/);
});
test("a verified save requires MAPI, draft CDA and unchanged public snapshots", () => {
  const { manifest } = prepared(); let ledger = newBatchLedger(manifest);
  const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  ledger = beginBatchAction(manifest, ledger, { en: pair.preimages.en, es: pair.preimages.es }, { batchAuthorized: true }).ledger;
  const evidence = savedEvidence(manifest, action);
  for (const metadata of [{ tag_list: ["unreviewed"] }, { publish_at: "2099-01-01T00:00:00.000Z" },
    { first_published_at: "2024-01-01T00:00:00.000Z" }, { unknown_vendor_metadata: true }]) {
    const changedMetadata = clone(evidence); Object.assign(changedMetadata.postEn, metadata);
    assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, changedMetadata), /UNEXPECTED_POST_METADATA_CHANGE/);
  }
  const corrupt = clone(evidence); corrupt.cdaEs.content.title = corrupt.cdaEn.content.title;
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, corrupt), /CDA_APPROVAL_MISMATCH/);
  const imageChanged = clone(evidence); imageChanged.cdaEn.content.image = [{ filename: "synthetic-changed-image" }];
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, imageChanged), /CDA_ENGLISH_SHARED_FIELDS_CHANGED/);
  const changed = clone(evidence); changed.publicPublishedStories.find((s) => s.uuid === pair.enUuid).content.title += " published early";
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, changed), /PUBLICATION_CHANGED_DURING_DRAFT_SAVE/);
  ledger = recordBatchOutcome(manifest, ledger, action.actionId, evidence);
  assert.equal(ledger.events.at(-1).status, "verified");
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, evidence), /ALREADY_VERIFIED_NO_DUPLICATE/);
});
test("all fourteen saves verify before Black-Box canary publication is proposed", () => {
  const { manifest } = prepared(); let ledger = newBatchLedger(manifest), saves = 0;
  while (nextBatchAction(manifest, ledger).kind === "save") {
    const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
    ledger = beginBatchAction(manifest, ledger, { en: pair.preimages.en, es: pair.preimages.es }, { batchAuthorized: true }).ledger;
    ledger = recordBatchOutcome(manifest, ledger, action.actionId, savedEvidence(manifest, action)); saves++;
  }
  assert.equal(saves, 14); const next = nextBatchAction(manifest, ledger);
  assert.equal(next.kind, "publish"); assert.equal(next.enUuid, "6bffd408-51d4-403b-a64a-cd22e3c3e287");
});
test("failed receipts stop the entire batch before publishing other stories", () => {
  const { manifest } = prepared(); let ledger = newBatchLedger(manifest);
  const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  ledger = beginBatchAction(manifest, ledger, { en: pair.preimages.en, es: pair.preimages.es }, { batchAuthorized: true }).ledger;
  ledger = recordBatchOutcome(manifest, ledger, action.actionId, { outcome: "failed" });
  assert.equal(nextBatchAction(manifest, ledger).kind, "reconcile-readonly");
});
test("publication verification requires unchanged legacy ES and matching published CDA metadata", () => {
  const { manifest } = prepared(); let ledger = newBatchLedger(manifest);
  while (nextBatchAction(manifest, ledger).kind === "save") {
    const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
    ledger = beginBatchAction(manifest, ledger, pair.preimages, { batchAuthorized: true }).ledger;
    ledger = recordBatchOutcome(manifest, ledger, action.actionId, savedEvidence(manifest, action));
  }
  const action = nextBatchAction(manifest, ledger), pair = manifest.pairs.find((p) => p.enUuid === action.enUuid);
  ledger = beginBatchAction(manifest, ledger, pair.preimages, { batchAuthorized: true }).ledger;
  const evidence = savedEvidence(manifest, action);
  evidence.postEn.unpublished_changes = false;
  evidence.postEn.published_at = "2026-03-01T00:00:00.000Z";
  evidence.cdaVersion = "published";
  evidence.cdaEn.published_at = evidence.postEn.published_at;
  evidence.cdaEs.published_at = evidence.postEn.published_at;
  const missing = clone(evidence); delete missing.publicPublishedStories;
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, missing), /LEGACY_ES_PUBLISHED_RECEIPT_REQUIRED/);
  const changed = clone(evidence); changed.publicPublishedStories.find((s) => s.uuid === pair.esUuid).content.intro += " changed";
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, changed), /LEGACY_ES_PUBLICATION_CHANGED/);
  const stale = clone(evidence); stale.cdaEn.published_at = pair.preimages.en.published_at;
  assert.throws(() => recordBatchOutcome(manifest, ledger, action.actionId, stale), /PUBLISHED_CDA_METADATA_MISMATCH/);
  const recorded = recordBatchOutcome(manifest, ledger, action.actionId, evidence);
  assert.equal(nextBatchAction(manifest, recorded).kind, "publish");
  assert.notEqual(nextBatchAction(manifest, recorded).actionId, action.actionId);
});
test("one current published batch gate allows only a Preview candidate after all fifteen receipts", () => {
  const { manifest, ledger, evidence } = fullyPublished();
  const result = verifyPublishedBatch(manifest, ledger, evidence);
  assert.equal(result.status, "PASS"); assert.equal(result.historicalUrls, 30); assert.equal(result.primaryIdentities, 15);
  assert.equal(result.gate, "PREVIEW_CANDIDATE_ONLY"); assert.equal(result.productionMutationAllowed, false);
});
test("a missing publication receipt or extra URL stops the final gate", () => {
  const { manifest, ledger, evidence } = fullyPublished();
  const partial = clone(ledger); const lastId = partial.events.at(-1).actionId;
  partial.events = partial.events.filter((event) => event.actionId !== lastId);
  assert.throws(() => verifyPublishedBatch(manifest, partial, evidence), /ALL_PUBLICATIONS_MUST_BE_VERIFIED/);
  const extra = clone(evidence); const story = clone(extra.stories.find((s) => s.content.component === "post"));
  story.id = 1234567; story.uuid = uuid(1234567); story.slug = "unexpected-url"; story.full_slug = "posts/unexpected-url";
  delete story.content.slug_es; extra.stories.push(story);
  assert.throws(() => verifyPublishedBatch(manifest, ledger, extra), /PUBLISHED_HISTORICAL_URL_SET_CHANGED/);
});
test("changed Spanish legacy publication or category and stale approved content stop final activation gates", () => {
  const { manifest, ledger, evidence } = fullyPublished();
  const legacy = clone(evidence); legacy.stories.find((s) => s.uuid === manifest.pairs[0].esUuid).content.title += " drift";
  assert.throws(() => verifyPublishedBatch(manifest, ledger, legacy), /PUBLISHED_LEGACY_ES_CHANGED/);
  const category = clone(evidence); category.stories.find((s) => s.content.component === "Category").content.title += " drift";
  assert.throws(() => verifyPublishedBatch(manifest, ledger, category), /PUBLISHED_CATEGORIES_CHANGED/);
  const stale = clone(evidence); stale.stories.find((s) => s.uuid === manifest.pairs[0].enUuid).content.title += " drift";
  assert.throws(() => verifyPublishedBatch(manifest, ledger, stale), /PUBLISHED_BATCH_DIAGNOSTICS/);
});
test("CLI I/O boundaries refuse repository-local output and broad file permissions", async () => {
  const folder = await mkdtemp(join(tmpdir(), "bilingual-contract-test-"));
  const file = join(folder, "published.json");
  await writeFile(file, JSON.stringify({ version: "published", sourceKind: "cda-published-snapshot", stories: fixture().publishedStories }), { mode: 0o600 });
  await assert.rejects(createPrivateBatchDirectory(resolve("public/forbidden-private-batch")), /PRIVATE_OUTPUT_MUST_STAY_OUTSIDE_REPOSITORY/);
  assert.equal((await readPrivateBatchJson(file)).version, "published");
  await chmod(file, 0o644);
  await assert.rejects(readPrivateBatchJson(file), /PRIVATE_FILE_PERMISSIONS_REQUIRED/);
  await mkdir(join(folder, "reserved"), { mode: 0o700 });
});
test("repository-public symlinks to private external files cannot bypass lexical I/O guards", async () => {
  const folder = await mkdtemp(join(tmpdir(), "bilingual-private-symlink-test-"));
  await writeFile(join(folder, "synthetic.json"), JSON.stringify({ synthetic: true }), { mode: 0o600 });
  const link = resolve(`public/.bilingual-private-test-${process.pid}-${Date.now()}`);
  await symlink(folder, link, "dir");
  try {
    await assert.rejects(createPrivateBatchDirectory(join(link, "output")), /PRIVATE_OUTPUT_MUST_STAY_OUTSIDE_REPOSITORY/);
    await assert.rejects(readPrivateBatchJson(join(link, "synthetic.json")), /PRIVATE_DATA_MUST_STAY_OUTSIDE_REPOSITORY/);
  } finally { await unlink(link); }
});
