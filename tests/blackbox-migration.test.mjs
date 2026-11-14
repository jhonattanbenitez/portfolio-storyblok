import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEditorialCatalog,
  calculateDraftEditorialApprovalHash,
  findEditorialEntry,
  getEditorialPosts,
  isEditorialModelEnabled,
  toEditorialSitemapEntries,
} from "../lib/editorial-catalog.ts";
import { buildSitemapEntries, generateMetadataFromStory, generateStructuredData } from "../utils/seo.ts";
import { loadBlackboxMigrationFixtures } from "./integration/blackbox-migration.mjs";

// Real editorial bodies stay in a private snapshot outside Git. These tests
// never fetch a CMS or use credentials; they exercise an explicitly simulated
// future publication, not a consolidated publication observed in Storyblok.
const source = process.env.BLACKBOX_MIGRATION_SOURCE;
const data = source ? await loadBlackboxMigrationFixtures(source) : null;
const clone = (value) => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const checkSame = (actual, expected, label) => assert.ok(same(actual, expected), label);
const snapshotTest = (name, run) => test(name, {
  skip: !data && "Set BLACKBOX_MIGRATION_SOURCE to the reviewed private published snapshot",
}, run);

function context(value = data) {
  const baseline = value.baselineStories;
  const en = baseline.find((story) => story.uuid === value.pilot.enUuid);
  const es = baseline.find((story) => story.uuid === value.pilot.esLegacyUuid);
  const categories = value.stories.filter((story) => story.content?.component === "Category");
  const before = buildEditorialCatalog({ stories: baseline, categories });
  const after = buildEditorialCatalog({ stories: value.stories, spanishStories: [value.spanishRepresentation], categories });
  return { value, baseline, en, es, categories, before, after };
}

test("Black-Box migration requires explicit server opt-in, including Production", () => {
  assert.equal(isEditorialModelEnabled({}), false);
  assert.equal(isEditorialModelEnabled({ VERCEL_ENV: "production" }), false);
  assert.equal(isEditorialModelEnabled({ STORYBLOK_FIELD_TRANSLATION_ENABLED: "true", VERCEL_ENV: "production" }), true);
});

snapshotTest("Black-Box source is a simulation and both original published identities remain distinct", () => {
  const { en, es } = context();
  assert.equal(data.sourceKind, "future-consolidation-simulation");
  assert.ok(en && es && en.uuid !== es.uuid && en.id !== es.id);
  assert.ok(en.published_at && es.published_at);
  assert.equal(en.group_id, es.group_id);
  assert.ok(en.alternates.some((item) => item.id === es.id && item.full_slug === es.full_slug && item.published === true));
  assert.ok(es.alternates.some((item) => item.id === en.id && item.full_slug === en.full_slug && item.published === true));
});

snapshotTest("Black-Box English base fields survive the simulated consolidation without replacement", () => {
  const { en } = context();
  const consolidated = data.stories.find((story) => story.uuid === en.uuid);
  for (const [key, value] of Object.entries(en.content)) checkSame(consolidated.content[key], value, `English field ${key} changed`);
  for (const key of ["id", "uuid", "slug", "full_slug", "group_id", "alternates", "first_published_at", "updated_at"]) {
    checkSame(consolidated[key], en[key], `English metadata ${key} changed`);
  }
});

snapshotTest("Black-Box Spanish legacy record remains intact in the simulated upstream dataset", () => {
  const { es } = context();
  checkSame(data.stories.find((story) => story.uuid === es.uuid), es, "Spanish legacy record was changed or removed");
});

snapshotTest("Black-Box proposed commitment uses real identity and native Spanish keys through the existing helper", () => {
  const { en, es } = context();
  const proposal = clone(en);
  proposal.content.slug_es = es.slug;
  for (const field of ["title", "intro", "content"]) proposal.content[field + "__i18n__es_co"] = es.content[field];
  const hash = calculateDraftEditorialApprovalHash(proposal);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, data.proposedHash);
  for (const field of ["title", "intro", "content"]) delete proposal.content[field + "__i18n__es_co"];
  assert.equal(calculateDraftEditorialApprovalHash(proposal), null);
});

snapshotTest("Black-Box future CDA representations omit raw keys and retain the real CDA language/path shape", () => {
  const en = data.stories.find((story) => story.uuid === data.pilot.enUuid);
  assert.equal(data.spanishRepresentation.lang, "es-co");
  assert.equal(data.spanishRepresentation.full_slug, `es-co/${en.full_slug}`);
  assert.ok(!Object.keys(en.content).some((key) => key.includes("__i18n__")));
  assert.ok(!Object.keys(data.spanishRepresentation.content).some((key) => key.includes("__i18n__")));
});

snapshotTest("Black-Box historical English and Spanish URLs resolve to the English UUID", () => {
  const { after } = context();
  for (const href of [data.pilot.enPath, data.pilot.esPath]) {
    const entry = findEditorialEntry(after, href);
    assert.equal(entry?.uuid, data.pilot.enUuid);
    assert.equal(entry?.model, "field");
  }
});

snapshotTest("Black-Box three Spanish text fields retain their exact published Markdown values", () => {
  const { es, after } = context();
  const projected = findEditorialEntry(after, data.pilot.esPath).story;
  for (const field of ["title", "intro", "content"]) checkSame(projected.content[field], es.content[field], `Spanish ${field} lost exact published content`);
});

snapshotTest("Black-Box local projection preserves the Spanish displayed date and images", () => {
  const { es, after } = context();
  const projected = findEditorialEntry(after, data.pilot.esPath).story;
  for (const field of ["date", "image"]) checkSame(projected.content[field], es.content[field], `Spanish ${field} preservation failed`);
});

snapshotTest("Black-Box category identity and both category listings preserve their legacy locale meaning", () => {
  const { before, after } = context();
  for (const href of [data.pilot.enPath, data.pilot.esPath]) {
    const baseline = findEditorialEntry(before, href);
    const current = findEditorialEntry(after, href);
    assert.ok(baseline.categoryUuid && baseline.categorySlug);
    assert.equal(current.categoryUuid, baseline.categoryUuid);
    assert.equal(current.categorySlug, baseline.categorySlug);
    assert.ok(getEditorialPosts(after, current.locale, current.categorySlug).some((story) => story.uuid === data.pilot.enUuid));
  }
});

snapshotTest("Black-Box reciprocal links, canonical and hreflang retain both historical URLs", () => {
  const { after } = context();
  const en = findEditorialEntry(after, data.pilot.enPath);
  const es = findEditorialEntry(after, data.pilot.esPath);
  checkSame(en.localizedUrls, es.localizedUrls, "Reciprocal locale projections differ");
  for (const entry of [en, es]) {
    const metadata = generateMetadataFromStory(entry.story, entry.locale, entry.href, entry.localizedUrls);
    assert.equal(new URL(metadata.alternates.canonical).pathname, entry.href);
    assert.equal(new URL(metadata.alternates.languages.en).pathname, data.pilot.enPath);
    assert.equal(new URL(metadata.alternates.languages["es-CO"]).pathname, data.pilot.esPath);
  }
});

snapshotTest("Black-Box adoption preserves every other 28 legacy articles and all 30 article routes", () => {
  const { before, after } = context();
  assert.equal(before.entries.length, 30);
  assert.equal(after.entries.length, 30);
  const untouched = before.entries.filter((entry) => ![data.pilot.enUuid, data.pilot.esLegacyUuid].includes(entry.uuid));
  assert.equal(untouched.length, 28);
  for (const entry of untouched) checkSame(findEditorialEntry(after, entry.href), entry, "An unrelated legacy article changed");
  checkSame(after.entries.map((entry) => entry.href).sort(), before.entries.map((entry) => entry.href).sort(), "Historical route set changed");
});

snapshotTest("Black-Box sitemap contains every historical article URL once and no synthetic draft", () => {
  const { after } = context();
  const entries = toEditorialSitemapEntries(after);
  assert.equal(entries.length, 30);
  assert.equal(new Set(entries.map((entry) => entry.url.href)).size, 30);
  assert.ok(!entries.some((entry) => /i18n-pilot|i18n-piloto|editorial-private-draft|borrador-editorial-privado/.test(entry.url.href)));
});

for (const [label, alter] of [
  ["unapproved translation", (value) => { value.stories.find((story) => story.uuid === value.pilot.enUuid).content.es_translation_approved = false; }],
  ["invalid approval hash", (value) => { value.stories.find((story) => story.uuid === value.pilot.enUuid).content.es_approved_hash = "invalid"; }],
  ["partial Spanish translation", (value) => { delete value.spanishRepresentation.content.intro; }],
  ["unrelated legacy collision", (value) => { value.stories.find((story) => story.uuid === value.pilot.esLegacyUuid).group_id = "owned-unrelated-collision"; }],
]) {
  snapshotTest(`Black-Box rejection: ${label} retains the published legacy Spanish route`, () => {
    const value = clone(data);
    alter(value);
    const { after } = context(value);
    const entry = findEditorialEntry(after, value.pilot.esPath);
    assert.equal(entry?.uuid, value.pilot.esLegacyUuid);
    assert.equal(entry?.model, "legacy");
  });
}

// Owner-approved contract: both locale projections share the English base
// publication/modification history. The visible editorial date stays separate
// and is preserved by the displayed-date regression above.
snapshotTest("Black-Box consolidated EN/ES JSON-LD and sitemap use the English base timestamps", () => {
  const { en, after } = context();
  const validTimestamp = (value, label) => {
    assert.equal(typeof value, "string", `${label} must be a timestamp string`);
    assert.ok(value.length > 0 && Number.isFinite(Date.parse(value)), `${label} must be a valid timestamp`);
  };
  validTimestamp(en.first_published_at, "English base first_published_at");
  validTimestamp(en.updated_at, "English base updated_at");
  assert.ok(Date.parse(en.updated_at) >= Date.parse(en.first_published_at), "English modification must not precede first publication");
  const editorialSitemap = toEditorialSitemapEntries(after);
  const sitemap = buildSitemapEntries(editorialSitemap);
  for (const href of [data.pilot.enPath, data.pilot.esPath]) {
    const projected = findEditorialEntry(after, href);
    assert.equal(projected?.uuid, en.uuid);
    assert.equal(projected?.model, "field");
    const actual = generateStructuredData(projected.story, projected.locale, href);
    validTimestamp(actual.datePublished, `${projected.locale} JSON-LD datePublished`);
    validTimestamp(actual.dateModified, `${projected.locale} JSON-LD dateModified`);
    assert.equal(actual.datePublished, en.first_published_at, "Consolidated publication date must come from the English source snapshot");
    assert.equal(actual.dateModified, en.updated_at, "Consolidated modification date must come from the English source snapshot");
    const editorialEntries = editorialSitemap.filter((entry) => entry.url.href === href);
    const serializedEntries = sitemap.filter((entry) => new URL(entry.url).pathname === href);
    assert.equal(editorialEntries.length, 1, "Each historical URL must have one editorial sitemap entry");
    assert.equal(serializedEntries.length, 1, "Each historical URL must have one serialized sitemap entry");
    validTimestamp(editorialEntries[0].lastModified, `${projected.locale} editorial sitemap lastModified`);
    validTimestamp(serializedEntries[0].lastModified, `${projected.locale} sitemap lastmod input`);
    assert.equal(editorialEntries[0].lastModified, en.updated_at, "Editorial sitemap lastModified must use the English source snapshot");
    assert.equal(serializedEntries[0].lastModified, en.updated_at, "Sitemap lastmod must use the English source snapshot");
  }
});
