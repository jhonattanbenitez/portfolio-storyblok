import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { evaluateFieldTranslation } from "../scripts/pilots/field-translation-content.mjs";
import {
  resolveLocalizedStoryUrls,
  resolveStoryRouteRedirect,
} from "../lib/storyblok-data.ts";
import {
  absoluteUrl,
  buildSitemapEntries,
  generateMetadataFromStory,
} from "../utils/seo.ts";

// These owned fixtures contain fictional content and IDs. They do not certify
// the CMS subscription, publication state, localized-key suffix or slug support.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/field-translation-pilot.json", import.meta.url), "utf8"));
const input = () => structuredClone({
  baseStory: fixture.baseStory,
  localizedFields: fixture.localizedFields,
  publication: fixture.publication,
});
const warning = () => {};

test("offline content pilot: explicit complete fields yield exactly the translated content", () => {
  assert.deepEqual(evaluateFieldTranslation(input()), {
    eligible: true,
    reason: "READY",
    content: fixture.expectedContent,
  });
});

test("offline content pilot: verified joint publication allows a null per-locale flag", () => {
  const value = input();
  assert.equal(value.publication.localePublished, null);
  assert.equal(evaluateFieldTranslation(value).eligible, true);
});

test("offline content pilot: an explicit negative locale flag overrides joint publication evidence", () => {
  const value = input();
  value.publication.localePublished = false;
  assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "LOCALE_UNPUBLISHED" });
});

test("offline content pilot: verified individual publication requires the locale's true flag", () => {
  const value = input();
  Object.assign(value.publication, { mode: "individual", localePublished: true });
  assert.equal(evaluateFieldTranslation(value).reason, "READY");
});

for (const flag of [false, null, undefined, "true"]) {
  test(`offline content pilot: individual publication rejects locale flag ${String(flag)}`, () => {
    const value = input();
    Object.assign(value.publication, { mode: "individual", localePublished: flag });
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "LOCALE_UNPUBLISHED" });
  });
}

for (const published of [false, null, undefined, "true"]) {
  test(`offline content pilot: article publication must be literal true (${String(published)})`, () => {
    const value = input();
    value.baseStory.published = published;
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "ARTICLE_UNPUBLISHED" });
  });
}

for (const scenario of ["unconfirmed", "missing-confirmation", "different-story", "draft-changes", "unknown-draft-state"]) {
  test(`offline content pilot: published snapshot must match the raw story (${scenario})`, () => {
    const value = input();
    if (scenario === "unconfirmed") value.publication.publishedSnapshotConfirmed = false;
    if (scenario === "missing-confirmation") delete value.publication.publishedSnapshotConfirmed;
    if (scenario === "different-story") value.publication.snapshotStoryId += 1;
    if (scenario === "draft-changes") value.baseStory.unpublished_changes = true;
    if (scenario === "unknown-draft-state") delete value.baseStory.unpublished_changes;
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "UNVERIFIED_PUBLISHED_SNAPSHOT" });
  });
}

for (const [label, identity] of [
  ["both missing", undefined],
  ["both null", null],
  ["zero", 0],
  ["negative", -1],
  ["fractional", 910001.5],
  ["numeric string", "910001"],
  ["NaN", NaN],
  ["infinite", Infinity],
  ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
]) {
  test(`offline content pilot: equal but invalid story identities cannot prove a published snapshot (${label})`, () => {
    const value = input();
    value.baseStory.id = identity;
    value.publication.snapshotStoryId = identity;
    if (identity === undefined) {
      delete value.baseStory.id;
      delete value.publication.snapshotStoryId;
    }
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "UNVERIFIED_PUBLISHED_SNAPSHOT" });
  });
}

test("offline content pilot: an absent input fails closed", () => {
  assert.deepEqual(evaluateFieldTranslation(), { eligible: false, reason: "ARTICLE_UNPUBLISHED" });
});

test("offline content pilot: a null input fails closed without throwing", () => {
  assert.deepEqual(evaluateFieldTranslation(null), { eligible: false, reason: "ARTICLE_UNPUBLISHED" });
});

for (const mode of ["unknown", undefined, "individual-inferred-from-slug"]) {
  test(`offline content pilot: publication mode cannot be inferred (${String(mode)})`, () => {
    const value = input();
    value.publication.mode = mode;
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "UNKNOWN_PUBLICATION_MODE" });
  });
}

for (const scenario of ["all-absent", "intro-absent", "title-blank", "body-whitespace", "intro-wrong-type"]) {
  test(`offline content pilot: missing or partial ES fields never fall back to English (${scenario})`, () => {
    const value = input();
    if (scenario === "all-absent") {
      for (const key of Object.values(value.localizedFields)) delete value.baseStory.content[key];
    }
    if (scenario === "intro-absent") delete value.baseStory.content[value.localizedFields.intro];
    if (scenario === "title-blank") value.baseStory.content[value.localizedFields.title] = "";
    if (scenario === "body-whitespace") value.baseStory.content[value.localizedFields.content] = " \n\t ";
    if (scenario === "intro-wrong-type") value.baseStory.content[value.localizedFields.intro] = [];
    assert.ok(value.baseStory.content.title && value.baseStory.content.intro && value.baseStory.content.content);
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "INCOMPLETE_TRANSLATION" });
  });
}

for (const scenario of ["base-field-map", "missing-map-entry", "empty-suffix", "mixed-suffixes", "swapped-fields"]) {
  test(`offline content pilot: explicit localized-key mapping is required (${scenario})`, () => {
    const value = input();
    if (scenario === "base-field-map") value.localizedFields = { title: "title", intro: "intro", content: "content" };
    if (scenario === "missing-map-entry") delete value.localizedFields.intro;
    if (scenario === "empty-suffix") value.localizedFields.title = "title__i18n__";
    if (scenario === "mixed-suffixes") value.localizedFields.intro = "intro__i18n__another_fixture";
    if (scenario === "swapped-fields") value.localizedFields.title = value.localizedFields.intro;
    assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "INCOMPLETE_TRANSLATION" });
  });
}

test("offline content pilot: inherited translations do not count as explicit raw fields", () => {
  const value = input();
  const key = value.localizedFields.title;
  const inherited = { [key]: value.baseStory.content[key] };
  delete value.baseStory.content[key];
  Object.setPrototypeOf(value.baseStory.content, inherited);
  assert.deepEqual(evaluateFieldTranslation(value), { eligible: false, reason: "INCOMPLETE_TRANSLATION" });
});

test("offline content pilot: legitimate identical translated text is not rejected", () => {
  const value = input();
  value.baseStory.content[value.localizedFields.title] = value.baseStory.content.title;
  const result = evaluateFieldTranslation(value);
  assert.equal(result.eligible, true);
  assert.equal(result.content.title, value.baseStory.content.title);
});

test("offline content pilot: evaluator does not mutate raw story, map or publication evidence", () => {
  const value = input();
  const before = structuredClone(value);
  evaluateFieldTranslation(value);
  assert.deepEqual(value, before);
});

test("offline content pilot: content readiness alone provides no localized slug or URL eligibility", async () => {
  const value = input();
  assert.deepEqual(value.baseStory.translated_slugs, []);
  const result = evaluateFieldTranslation(value);
  assert.equal(result.reason, "READY");
  assert.deepEqual(Object.keys(result).sort(), ["content", "eligible", "reason"]);
  const urls = await resolveLocalizedStoryUrls({
    story: value.baseStory, currentLocale: "en", version: "published", onWarning: warning,
    fetchAlternate: async () => { throw new Error("No alternate exists in the field fixture"); },
  });
  assert.deepEqual(urls, [{ locale: "en", href: fixture.historicalPilotPaths.en }]);
  const metadata = generateMetadataFromStory(value.baseStory, "en", fixture.historicalPilotPaths.en, urls);
  assert.equal(metadata.alternates.languages["es-CO"], undefined);
});

function legacyPair(index, component = "post") {
  const root = component === "Category" ? "categories" : "posts";
  const pilot = component === "post" && index === 0;
  const enPath = pilot ? fixture.historicalPilotPaths.en.slice(1) : `${root}/synthetic-english-${index}`;
  const esPath = pilot ? fixture.historicalPilotPaths["es-co"].replace(/^\/es-co\//, "") : `${root}/sintetico-espanol-${index}`;
  const shared = { group_id: `synthetic-legacy-${component}-${index}`, published: true };
  const en = { ...shared, id: 920000 + index * 2, uuid: `synthetic-${component}-en-${index}`, name: "Synthetic English", full_slug: enPath, content: { component, language: "english", title: "Invented English title", intro: "Invented intro", content: "Invented body" } };
  const es = { ...shared, id: en.id + 1, uuid: `synthetic-${component}-es-${index}`, name: "Español sintético", full_slug: esPath, content: { component, language: "spanish", title: "Título español inventado", intro: "Introducción inventada", content: "Cuerpo inventado" } };
  for (const [story, other] of [[en, es], [es, en]]) {
    story.slug = story.full_slug.split("/").at(-1);
    story.alternates = [{ id: other.id, full_slug: other.full_slug, published: true }];
  }
  return { en, es };
}

test("C3 regression: the two historical pilot URLs still resolve to their published legacy partner", async () => {
  const { en, es } = legacyPair(0);
  assert.equal(await resolveStoryRouteRedirect({ story: en, locale: "en", version: "published" }), null);
  assert.equal(await resolveStoryRouteRedirect({ story: es, locale: "es-co", version: "published" }), null);
  assert.equal(await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published", fetchAlternate: async () => es }), fixture.historicalPilotPaths["es-co"]);
  assert.equal(await resolveStoryRouteRedirect({ story: es, locale: "en", version: "published", fetchAlternate: async () => en }), fixture.historicalPilotPaths.en);
});

test("C3 regression: 15 owned synthetic legacy pairs retain 30 unique localized canonicals and sitemap entries", async () => {
  const pages = [];
  for (let index = 0; index < 15; index++) {
    const { en, es } = legacyPair(index);
    const urls = await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es });
    assert.equal(urls.length, 2);
    for (const [story, locale] of [[en, "en"], [es, "es-co"]]) {
      const href = urls.find((url) => url.locale === locale).href;
      const metadata = generateMetadataFromStory(story, locale, href, urls);
      assert.equal(metadata.alternates.canonical, absoluteUrl(href));
      assert.equal(metadata.alternates.languages["en"], absoluteUrl(urls[0].href));
      assert.equal(metadata.alternates.languages["es-CO"], absoluteUrl(urls[1].href));
      pages.push({ url: { locale, href }, alternates: urls });
    }
  }
  const entries = buildSitemapEntries([...pages, pages[0], pages[1]]);
  assert.equal(entries.length, 30);
  assert.equal(new Set(entries.map((row) => row.url)).size, 30);
  assert.ok(entries.every((row) => row.url.startsWith("https://www.jhonattan.dev/")));
  assert.equal(entries.some((row) => /\/es\//.test(row.url)), false);
});

test("C3 regression: an unpublished legacy alternate creates neither hreflang nor sitemap translation", async () => {
  const { en, es } = legacyPair(0);
  en.alternates[0].published = false;
  const urls = await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es, onWarning: warning });
  assert.deepEqual(urls, [{ locale: "en", href: fixture.historicalPilotPaths.en }]);
  const metadata = generateMetadataFromStory(en, "en", urls[0].href, urls);
  assert.equal(metadata.alternates.languages["es-CO"], undefined);
  const entries = buildSitemapEntries(urls.map((url) => ({ url, alternates: urls })));
  assert.deepEqual(entries.map((row) => row.url), [absoluteUrl(fixture.historicalPilotPaths.en)]);
});

test("C3 regression: category switching keeps the actual legacy category paths", async () => {
  const { en, es } = legacyPair(0, "Category");
  const urls = await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es });
  assert.deepEqual(urls, [
    { locale: "en", href: `/${en.full_slug}` },
    { locale: "es-co", href: `/es-co/${es.full_slug}` },
  ]);
  assert.equal(await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published", fetchAlternate: async () => es }), urls[1].href);
  assert.equal(await resolveStoryRouteRedirect({ story: es, locale: "en", version: "published", fetchAlternate: async () => en }), urls[0].href);
});
