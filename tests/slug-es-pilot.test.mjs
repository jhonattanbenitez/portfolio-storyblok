import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isValidPostSlug,
  calculateEsApprovalHash,
  evaluateSlugEsRecord,
  buildSlugEsCatalog,
  resolveSlugEsPath,
  localizedUrlsForIdentity,
  sameSlugRedirect,
} from "../scripts/pilots/slug-es-routing.mjs";
import { resolveLocalizedStoryUrls, resolveStoryRouteRedirect } from "../lib/storyblok-data.ts";
import { absoluteUrl, generateMetadataFromStory, buildSitemapEntries } from "../utils/seo.ts";

// Every ID and editorial value belongs to this test. These assertions do not
// certify the actual CMS schema, localized raw-key spelling or published API.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/slug-es-pilot.json", import.meta.url), "utf8"));
const owned = () => structuredClone(fixture);
function approvedInput() {
  const value = structuredClone(fixture.fieldInput);
  value.baseStory.content.es_approved_hash = calculateEsApprovalHash(value);
  return value;
}
function catalog(input = approvedInput(), stories = owned()) {
  // The hypothetical candidate and published route inventory use one coherent
  // snapshot. The untouched legacyEn fixture remains a rollback reference only.
  return buildSlugEsCatalog({ publishedStories: [structuredClone(input.baseStory), stories.legacyEs], candidates: [input] });
}
const reasons = (value) => value.diagnostics.map((row) => row.reason ?? row.code);
const sortedUrls = (urls) => [...urls].sort((a, b) => a.locale.localeCompare(b.locale));
const expectedUrls = () => [{ locale: "en", href: fixture.historicalPaths.en }, { locale: "es-co", href: fixture.historicalPaths["es-co"] }];
const quiet = () => {};

for (const slug of ["a", "article-2", "black-box-abstraction-thinking-in-boxes", "api", "es-co", "a".repeat(160)]) {
  test(`slug_es syntax: accepts a canonical ASCII single segment (${slug.length > 50 ? "maximum length" : slug})`, () => {
    assert.equal(isValidPostSlug(slug), true);
  });
}

for (const [name, slug] of [
  ["empty", ""], ["leading space", " articulo"], ["trailing space", "articulo "],
  ["uppercase", "Articulo"], ["slash", "posts/articulo"], ["locale prefix", "es-co/posts/articulo"],
  ["leading slash", "/articulo"], ["backslash", "posts\\articulo"], ["query", "articulo?q=1"],
  ["fragment", "articulo#section"], ["encoded slash", "articulo%2fescape"], ["double encoding", "articulo%252fescape"],
  ["traversal", ".."], ["dot", "."], ["embedded dot", "articulo.html"],
  ["repeated hyphen", "articulo--nuevo"], ["leading hyphen", "-articulo"], ["trailing hyphen", "articulo-"],
  ["underscore", "articulo_nuevo"], ["accent", "abstracción"], ["combining accent", "abstraccio\u0301n"],
  ["emoji", "articulo-📦"], ["control", "articulo\n"], ["NUL", "articulo\u0000"],
  ["too long", "a".repeat(161)], ["null", null], ["number", 123],
]) {
  test(`slug_es syntax: rejects ${name} without silently normalizing`, () => {
    assert.equal(isValidPostSlug(slug), false);
  });
}

test("A: one approved identity retains the two exact historical pilot URLs", () => {
  const value = approvedInput();
  const result = evaluateSlugEsRecord(value);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, "READY");
  assert.equal(result.id, fixture.legacyEn.id);
  assert.equal(result.uuid, fixture.legacyEn.uuid);
  assert.equal(result.enHref, fixture.historicalPaths.en);
  assert.equal(result.esHref, fixture.historicalPaths["es-co"]);
  assert.deepEqual(result.content, {
    title: fixture.legacyEs.content.title,
    intro: fixture.legacyEs.content.intro,
    content: fixture.legacyEs.content.content,
  });
});

test("A approval: hash is a stable content fingerprint, not the approval boolean", () => {
  const value = approvedInput();
  const hash = calculateEsApprovalHash(value);
  assert.match(hash, /^[0-9a-f]{64}$/);
  value.baseStory.content.es_translation_approved = false;
  value.baseStory.content.es_approved_hash = "arbitrary-old-marker";
  assert.equal(calculateEsApprovalHash(value), hash);
  assert.equal(evaluateSlugEsRecord(value).reason, "NOT_APPROVED");
});

test("A approval: timestamps do not substitute for editorial content approval", () => {
  const value = approvedInput();
  const hash = calculateEsApprovalHash(value);
  Object.assign(value.baseStory, { updated_at: "2040-01-01", published_at: "2040-01-02" });
  assert.equal(calculateEsApprovalHash(value), hash);
});

test("A approval workflow: draft content can be reviewed before one publication without granting public eligibility", () => {
  const ready = approvedInput();
  const draft = structuredClone(ready);
  draft.baseStory.published = false;
  draft.baseStory.unpublished_changes = true;
  draft.publication.publishedSnapshotConfirmed = false;
  const reviewedHash = calculateEsApprovalHash(draft);
  assert.match(reviewedHash, /^[0-9a-f]{64}$/);
  assert.equal(reviewedHash, ready.baseStory.content.es_approved_hash);
  assert.equal(evaluateSlugEsRecord(draft).reason, "ARTICLE_UNPUBLISHED");

  const published = structuredClone(draft);
  published.baseStory.published = true;
  published.baseStory.unpublished_changes = false;
  published.publication.publishedSnapshotConfirmed = true;
  assert.equal(calculateEsApprovalHash(published), reviewedHash);
  assert.equal(evaluateSlugEsRecord(published).reason, "READY");
});

for (const [name, mutate] of [
  ["English title", (v) => { v.baseStory.content.title += " changed"; }],
  ["English intro", (v) => { v.baseStory.content.intro += " changed"; }],
  ["English body", (v) => { v.baseStory.content.content += " changed"; }],
  ["Spanish title", (v) => { v.baseStory.content[v.localizedFields.title] += " cambiado"; }],
  ["Spanish intro", (v) => { v.baseStory.content[v.localizedFields.intro] += " cambiado"; }],
  ["Spanish body", (v) => { v.baseStory.content[v.localizedFields.content] += " cambiado"; }],
  ["Spanish slug", (v) => { v.baseStory.content.slug_es = "otro-slug-espanol"; }],
  ["English slug", (v) => { v.baseStory.slug = "another-english-slug"; v.baseStory.full_slug = "posts/another-english-slug"; }],
  ["category identity", (v) => { v.baseStory.content.category_ref.id = "another-category"; }],
  ["story identity", (v) => { v.baseStory.uuid = "another-synthetic-uuid"; }],
]) {
  test(`A approval: changing ${name} invalidates the approved fingerprint`, () => {
    const value = approvedInput();
    const previousHash = value.baseStory.content.es_approved_hash;
    mutate(value);
    assert.notEqual(calculateEsApprovalHash(value), previousHash);
    assert.equal(evaluateSlugEsRecord(value).reason, "STALE_APPROVAL");
  });
}

for (const approved of [false, null, undefined, "true"]) {
  test(`A approval: literal editorial approval is required (${String(approved)})`, () => {
    const value = approvedInput();
    value.baseStory.content.es_translation_approved = approved;
    assert.equal(evaluateSlugEsRecord(value).reason, "NOT_APPROVED");
  });
}

for (const [name, mutate, expected] of [
  ["article unpublished", (v) => { v.baseStory.published = false; }, "ARTICLE_UNPUBLISHED"],
  ["draft changes", (v) => { v.baseStory.unpublished_changes = true; }, "UNVERIFIED_PUBLISHED_SNAPSHOT"],
  ["wrong published snapshot", (v) => { v.publication.snapshotStoryId += 1; }, "UNVERIFIED_PUBLISHED_SNAPSHOT"],
  ["unconfirmed snapshot", (v) => { v.publication.publishedSnapshotConfirmed = false; }, "UNVERIFIED_PUBLISHED_SNAPSHOT"],
  ["publication mode unknown", (v) => { v.publication.mode = "unknown"; }, "UNKNOWN_PUBLICATION_MODE"],
  ["individual ES unpublished", (v) => { v.publication.mode = "individual"; v.publication.localePublished = false; }, "LOCALE_UNPUBLISHED"],
  ["missing Spanish body", (v) => { delete v.baseStory.content[v.localizedFields.content]; }, "INCOMPLETE_TRANSLATION"],
  ["blank Spanish intro", (v) => { v.baseStory.content[v.localizedFields.intro] = " \t\n"; }, "INCOMPLETE_TRANSLATION"],
  ["English fallback mapping", (v) => { v.localizedFields.title = "title"; }, "INCOMPLETE_TRANSLATION"],
]) {
  test(`A content: ${name} cannot become a new Spanish route`, () => {
    const value = approvedInput();
    mutate(value);
    const result = evaluateSlugEsRecord(value);
    assert.equal(result.eligible, false);
    assert.equal(result.reason, expected);
    const legacy = catalog(value);
    const route = resolveSlugEsPath(legacy, fixture.historicalPaths["es-co"]);
    assert.equal(route.uuid, fixture.legacyEs.uuid);
    assert.equal(route.model, "legacy");
  });
}

test("A content: an inherited translated field cannot prove completeness", () => {
  const value = approvedInput();
  const key = value.localizedFields.content;
  const inherited = { [key]: value.baseStory.content[key] };
  delete value.baseStory.content[key];
  Object.setPrototypeOf(value.baseStory.content, inherited);
  assert.equal(evaluateSlugEsRecord(value).reason, "INCOMPLETE_TRANSLATION");
});

for (const [name, mutate] of [
  ["wrong component", (v) => { v.baseStory.content.component = "page"; }],
  ["wrong base language", (v) => { v.baseStory.content.language = "spanish"; }],
  ["empty English body", (v) => { v.baseStory.content.content = ""; }],
  ["empty UUID", (v) => { v.baseStory.uuid = ""; }],
  ["invalid story ID", (v) => { v.baseStory.id = 0; }],
  ["full slug mismatch", (v) => { v.baseStory.full_slug = "posts/different"; }],
]) {
  test(`A source: rejects ${name}`, () => {
    const value = approvedInput();
    mutate(value);
    assert.equal(evaluateSlugEsRecord(value).reason, "INVALID_SOURCE");
  });
}

for (const slug of ["", "Una-Traduccion", "posts/otro", "otro%2fslug"]) {
  test(`A candidate: invalid slug_es is not repaired or guessed (${JSON.stringify(slug)})`, () => {
    const value = approvedInput();
    value.baseStory.content.slug_es = slug;
    assert.equal(evaluateSlugEsRecord(value).reason, "INVALID_SLUG");
    assert.equal(resolveSlugEsPath(catalog(value), fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
  });
}

test("A catalog: validated migration replaces only legacy ES ownership, preserving both original records", () => {
  const value = approvedInput();
  const originals = owned();
  const before = structuredClone(originals);
  const result = catalog(value, originals);
  assert.deepEqual(originals, before);
  assert.equal(result.routes.length, 2);
  const en = resolveSlugEsPath(result, fixture.historicalPaths.en);
  const es = resolveSlugEsPath(result, fixture.historicalPaths["es-co"]);
  assert.equal(en.uuid, fixture.legacyEn.uuid);
  assert.equal(es.uuid, en.uuid);
  assert.equal(es.id, en.id);
  assert.equal(en.model, "field");
  assert.equal(es.model, "field");
  assert.deepEqual(sortedUrls(localizedUrlsForIdentity(result, en.uuid)), expectedUrls());
  assert.deepEqual(localizedUrlsForIdentity(result, fixture.legacyEs.uuid), []);
});

for (const scenario of ["group", "outbound reference", "return reference", "unpublished reference", "wrong source path", "wrong target path"]) {
  test(`A collision: ${scenario} mismatch cannot hijack the occupied legacy ES URL`, () => {
    const value = approvedInput();
    const stories = owned();
    if (scenario === "group") stories.legacyEs.group_id = "unrelated-group";
    if (scenario === "outbound reference") value.baseStory.alternates = [];
    if (scenario === "return reference") stories.legacyEs.alternates = [];
    if (scenario === "unpublished reference") value.baseStory.alternates[0].published = false;
    if (scenario === "wrong source path") stories.legacyEs.alternates[0].full_slug = "posts/another-source";
    if (scenario === "wrong target path") value.baseStory.alternates[0].full_slug = "posts/another-target";
    const result = catalog(value, stories);
    assert.ok(reasons(result).includes("LEGACY_SLUG_COLLISION"));
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
  });
}

test("A collision: an unrelated Spanish identity keeps its path when a candidate attempts replacement", () => {
  const value = approvedInput();
  const stories = owned();
  Object.assign(stories.legacyEs, { id: 939999, uuid: "synthetic-unrelated-es", group_id: "another-group", alternates: [] });
  const result = catalog(value, stories);
  assert.ok(reasons(result).includes("LEGACY_SLUG_COLLISION"));
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, stories.legacyEs.uuid);
});

for (const scenario of ["missing English identity", "different English UUID", "different English ID"]) {
  test(`A catalog: ${scenario} cannot be replaced implicitly`, () => {
    const value = approvedInput();
    const stories = owned();
    stories.legacyEn = structuredClone(value.baseStory);
    let publishedStories = [stories.legacyEn, stories.legacyEs];
    if (scenario === "missing English identity") publishedStories = [stories.legacyEs];
    if (scenario === "different English UUID") stories.legacyEn.uuid = "synthetic-other-en";
    if (scenario === "different English ID") stories.legacyEn.id += 100;
    const result = buildSlugEsCatalog({ publishedStories, candidates: [value] });
    assert.ok(reasons(result).includes("EN_IDENTITY_COLLISION"));
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
  });
}

function anotherCandidate() {
  const value = approvedInput();
  Object.assign(value.baseStory, { id: 930003, uuid: "synthetic-second-en", group_id: "synthetic-second-group", slug: "another-english-post", full_slug: "posts/another-english-post", alternates: [] });
  value.publication.snapshotStoryId = value.baseStory.id;
  value.baseStory.content.es_approved_hash = calculateEsApprovalHash(value);
  const published = structuredClone(value.baseStory);
  return { value, published };
}

test("A duplicates: different candidates claiming one ES slug are rejected regardless of input order", () => {
  const first = approvedInput();
  const second = anotherCandidate();
  const stories = owned();
  const publishedStories = [structuredClone(first.baseStory), stories.legacyEs, second.published];
  const forward = buildSlugEsCatalog({ publishedStories, candidates: [first, second.value] });
  const reverse = buildSlugEsCatalog({ publishedStories: [...publishedStories].reverse(), candidates: [second.value, first] });
  assert.ok(reasons(forward).includes("DUPLICATE_ES_SLUG"));
  assert.ok(reasons(reverse).includes("DUPLICATE_ES_SLUG"));
  assert.equal(forward.routes.some((r) => r.model === "field" && r.locale === "es-co"), false);
  assert.deepEqual(forward.routes, reverse.routes);
  assert.equal(resolveSlugEsPath(forward, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
});

test("A duplicates: an unapproved duplicate proposal does not silently lose to the approved one", () => {
  const second = anotherCandidate();
  second.value.baseStory.content.es_translation_approved = false;
  const stories = owned();
  const first = approvedInput();
  const result = buildSlugEsCatalog({ publishedStories: [structuredClone(first.baseStory), stories.legacyEs, second.published], candidates: [first, second.value] });
  assert.ok(reasons(result).includes("DUPLICATE_ES_SLUG"));
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
});

test("A duplicates: duplicate input for the same candidate identity is not resolved by array order", () => {
  const value = approvedInput();
  const stories = owned();
  const result = buildSlugEsCatalog({ publishedStories: [structuredClone(value.baseStory), stories.legacyEs], candidates: [value, structuredClone(value)] });
  assert.ok(reasons(result).includes("DUPLICATE_CANDIDATE_IDENTITY"));
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
});

test("A snapshots: candidate approval cannot replace a legacy source snapshot without its reviewed fields", () => {
  const value = approvedInput();
  const stories = owned();
  const result = buildSlugEsCatalog({ publishedStories: [stories.legacyEn, stories.legacyEs], candidates: [value] });
  assert.ok(reasons(result).includes("SNAPSHOT_MISMATCH"));
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths.en).model, "legacy");
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
});

test("A snapshots: a source with unpublished changes cannot authorize adoption through a clean candidate hash", () => {
  const value = approvedInput();
  const stories = owned();
  const changedSource = structuredClone(value.baseStory);
  changedSource.unpublished_changes = true;
  assert.equal(calculateEsApprovalHash({ ...value, baseStory: changedSource }), calculateEsApprovalHash(value));
  const result = buildSlugEsCatalog({ publishedStories: [changedSource, stories.legacyEs], candidates: [value] });
  assert.ok(reasons(result).includes("SNAPSHOT_MISMATCH"));
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths.en).model, "legacy");
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).model, "legacy");
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
});

test("A snapshots: inconsistent published snapshots keep legacy paths independent of array order", () => {
  const value = approvedInput();
  const stories = owned();
  const current = structuredClone(value.baseStory);
  const stale = structuredClone(current);
  stale.content.title += " changed after approval";
  const forward = buildSlugEsCatalog({ publishedStories: [current, stale, stories.legacyEs], candidates: [value] });
  const reverse = buildSlugEsCatalog({ publishedStories: [stories.legacyEs, stale, current], candidates: [value] });
  assert.ok(reasons(forward).includes("INCONSISTENT_PUBLISHED_SNAPSHOT"));
  assert.deepEqual(forward, reverse);
  for (const result of [forward, reverse]) {
    assert.equal(result.usableSnapshot, false);
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths.en).model, "legacy");
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).model, "legacy");
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
  }
});

test("A snapshots: identical repeated published records deduplicate without changing the adopted identity", () => {
  const value = approvedInput();
  const stories = owned();
  const current = structuredClone(value.baseStory);
  const baseline = buildSlugEsCatalog({ publishedStories: [current, stories.legacyEs], candidates: [value] });
  const repeated = buildSlugEsCatalog({ publishedStories: [current, structuredClone(current), stories.legacyEs], candidates: [value] });
  assert.deepEqual(repeated, baseline);
  assert.equal(repeated.routes.length, 2);
  assert.equal(resolveSlugEsPath(repeated, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEn.uuid);
});

test("A snapshots: one published identity cannot acquire two English canonicals by input order", () => {
  const value = approvedInput();
  const stories = owned();
  const current = structuredClone(value.baseStory);
  const contradictory = structuredClone(current);
  contradictory.slug = "another-english-canonical";
  contradictory.full_slug = "posts/another-english-canonical";
  const forward = buildSlugEsCatalog({ publishedStories: [current, contradictory, stories.legacyEs], candidates: [value] });
  const reverse = buildSlugEsCatalog({ publishedStories: [stories.legacyEs, contradictory, current], candidates: [value] });
  assert.deepEqual(forward, reverse);
  assert.ok(reasons(forward).includes("PUBLISHED_IDENTITY_CONFLICT"));
  assert.equal(forward.usableSnapshot, false);
  assert.equal(resolveSlugEsPath(forward, fixture.historicalPaths.en), null);
  assert.equal(resolveSlugEsPath(forward, "/posts/another-english-canonical"), null);
  const spanish = resolveSlugEsPath(forward, fixture.historicalPaths["es-co"]);
  assert.equal(spanish.uuid, fixture.legacyEs.uuid);
  assert.equal(spanish.model, "legacy");
});

test("A transition: unapproved or invalid field candidates preserve both verified legacy language destinations", () => {
  for (const scenario of ["unapproved", "invalid slug"]) {
    const value = approvedInput();
    if (scenario === "unapproved") value.baseStory.content.es_translation_approved = false;
    else value.baseStory.content.slug_es = "invalid/path";
    const result = catalog(value);
    assert.equal(result.usableSnapshot, true);
    for (const uuid of [fixture.legacyEn.uuid, fixture.legacyEs.uuid]) {
      assert.deepEqual(sortedUrls(localizedUrlsForIdentity(result, uuid)), expectedUrls(), scenario);
    }
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths.en).model, "legacy");
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).model, "legacy");
  }
});

test("A transition: additional alternates on either legacy member block field takeover", () => {
  for (const member of ["english", "spanish"]) {
    const value = approvedInput();
    const stories = owned();
    const target = member === "english" ? value.baseStory : stories.legacyEs;
    target.alternates.push({ id: 979999, full_slug: "posts/unrelated-alternate", published: true });
    const result = catalog(value, stories);
    assert.ok(reasons(result).includes("LEGACY_SLUG_COLLISION"), member);
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths.en).model, "legacy");
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).model, "legacy");
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEs.uuid);
  }
});

test("A duplicates: unrelated legacy records sharing a route have no arbitrary first or last winner", () => {
  const stories = owned();
  const duplicate = structuredClone(stories.legacyEs);
  Object.assign(duplicate, { id: 938888, uuid: "synthetic-duplicate-es", group_id: "another-group" });
  for (const ordered of [[stories.legacyEn, stories.legacyEs, duplicate], [duplicate, stories.legacyEs, stories.legacyEn]]) {
    const result = buildSlugEsCatalog({ publishedStories: ordered, candidates: [] });
    assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]), null);
    assert.ok(result.diagnostics.length > 0);
  }
});

test("A catalog: new unoccupied ES slug is allowed only for an existing published EN identity", () => {
  const value = approvedInput();
  value.baseStory.content.slug_es = "nuevo-articulo-espanol";
  value.baseStory.content.es_approved_hash = calculateEsApprovalHash(value);
  const result = buildSlugEsCatalog({ publishedStories: [structuredClone(value.baseStory)], candidates: [value] });
  assert.equal(resolveSlugEsPath(result, "/es-co/posts/nuevo-articulo-espanol").uuid, fixture.legacyEn.uuid);
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]), null);
});

test("A catalog: only published legacy records enter the public route catalog", () => {
  const stories = owned();
  stories.legacyEs.published = false;
  const result = buildSlugEsCatalog({ publishedStories: [stories.legacyEn, stories.legacyEs], candidates: [] });
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]), null);
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths.en).uuid, fixture.legacyEn.uuid);
});

test("A catalog: lookup accepts only exact canonical pathnames and never guesses or decodes", () => {
  const result = catalog();
  for (const path of ["", "/es-co/posts/no-existe", `${fixture.historicalPaths["es-co"]}?x=1`, `${fixture.historicalPaths["es-co"]}#section`, `${fixture.historicalPaths["es-co"]}/`, "https://other.invalid/posts/article", "/es-co/posts/abstraccion%2fescape"]) {
    assert.equal(resolveSlugEsPath(result, path), null);
  }
  assert.deepEqual(localizedUrlsForIdentity(result, "unknown-synthetic-uuid"), []);
});

test("A catalog: inputs are immutable and emitted route paths are unique and deterministic", () => {
  const value = approvedInput();
  const stories = owned();
  const before = structuredClone({ value, stories });
  const result = catalog(value, stories);
  assert.deepEqual({ value, stories }, before);
  const paths = result.routes.map((r) => r.href);
  assert.deepEqual(paths, [...paths].sort());
  assert.equal(new Set(paths).size, paths.length);
});

test("A SEO: both historical canonicals, hreflang and selector destinations share one eligible identity", () => {
  const result = catalog();
  const urls = localizedUrlsForIdentity(result, fixture.legacyEn.uuid);
  for (const locale of ["en", "es-co"]) {
    const href = urls.find((u) => u.locale === locale).href;
    const meta = generateMetadataFromStory(fixture.fieldInput.baseStory, locale, href, urls);
    assert.equal(meta.alternates.canonical, absoluteUrl(fixture.historicalPaths[locale]));
    assert.equal(meta.alternates.languages.en, absoluteUrl(fixture.historicalPaths.en));
    assert.equal(meta.alternates.languages["es-CO"], absoluteUrl(fixture.historicalPaths["es-co"]));
  }
  const sitemap = buildSitemapEntries([...urls.map((url) => ({ url, alternates: urls })), { url: urls[0], alternates: urls }]);
  assert.deepEqual(sitemap.map((r) => r.url).sort(), expectedUrls().map((u) => absoluteUrl(u.href)).sort());
});

test("A migration: 15 owned synthetic pairs retain 30 exact paths while one pair gains a single identity", () => {
  const stories = owned();
  const pairs = [];
  for (let i = 1; i < 15; i++) {
    const en = structuredClone(stories.legacyEn);
    const es = structuredClone(stories.legacyEs);
    Object.assign(en, { id: 940000 + i * 2, uuid: `synthetic-en-${i}`, group_id: `synthetic-group-${i}`, slug: `english-${i}`, full_slug: `posts/english-${i}` });
    Object.assign(es, { id: en.id + 1, uuid: `synthetic-es-${i}`, group_id: en.group_id, slug: `espanol-${i}`, full_slug: `posts/espanol-${i}` });
    en.alternates = [{ id: es.id, full_slug: es.full_slug, published: true }];
    es.alternates = [{ id: en.id, full_slug: en.full_slug, published: true }];
    pairs.push(en, es);
  }
  const value = approvedInput();
  const inputStories = [structuredClone(value.baseStory), stories.legacyEs, ...pairs];
  const initial = buildSlugEsCatalog({ publishedStories: inputStories, candidates: [] });
  const transitioned = buildSlugEsCatalog({ publishedStories: inputStories, candidates: [value] });
  assert.equal(initial.routes.length, 30);
  assert.equal(transitioned.routes.length, 30);
  assert.deepEqual(initial.routes.map((r) => r.href), transitioned.routes.map((r) => r.href));
  const sitemap = buildSitemapEntries(transitioned.routes.map(({ locale, href }) => ({ url: { locale, href } })));
  assert.equal(sitemap.length, 30);
  assert.equal(new Set(sitemap.map((r) => r.url)).size, 30);
});

test("A categories: a shared category identity participates in approval while existing category links remain legacy", async () => {
  const value = approvedInput();
  const result = catalog(value);
  assert.equal(resolveSlugEsPath(result, fixture.historicalPaths["es-co"]).uuid, fixture.legacyEn.uuid);
  const en = { id: 960001, uuid: "synthetic-category-en", group_id: "synthetic-category-pair", full_slug: "categories/english-category", content: { component: "Category", language: "english" }, alternates: [{ id: 960002, full_slug: "categories/categoria-espanola", published: true }] };
  const es = { id: 960002, uuid: "synthetic-category-es", group_id: en.group_id, full_slug: "categories/categoria-espanola", content: { component: "Category", language: "spanish" }, alternates: [{ id: en.id, full_slug: en.full_slug, published: true }] };
  const urls = await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es, onWarning: quiet });
  assert.deepEqual(urls, [{ locale: "en", href: "/categories/english-category" }, { locale: "es-co", href: "/es-co/categories/categoria-espanola" }]);
  assert.equal(await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published", fetchAlternate: async () => es }), urls[1].href);
});

test("B: same slug uses an explicit permanent redirect and changes the Spanish canonical", () => {
  const result = sameSlugRedirect(fixture.legacyEn.slug, fixture.legacyEs.slug);
  const canonical = `/es-co/posts/${fixture.legacyEn.slug}`;
  assert.deepEqual(result, { status: 308, from: fixture.historicalPaths["es-co"], to: canonical, canonical });
  assert.notEqual(result.canonical, fixture.historicalPaths["es-co"]);
  assert.equal(sameSlugRedirect(fixture.legacyEn.slug, fixture.legacyEn.slug), null);
  assert.equal(sameSlugRedirect("../unsafe", fixture.legacyEs.slug), null);
});

test("C: the existing paired-story resolver retains both original public identities", async () => {
  const { legacyEn: en, legacyEs: es } = owned();
  const urls = await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es, onWarning: quiet });
  assert.deepEqual(sortedUrls(urls), expectedUrls());
  assert.equal(await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published", fetchAlternate: async () => es }), fixture.historicalPaths["es-co"]);
  assert.equal(en.uuid === es.uuid, false);
});
