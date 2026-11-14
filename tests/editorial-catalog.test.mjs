import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import {
  buildEditorialCatalog,
  calculateDraftEditorialApprovalHash,
  calculateEditorialApprovalHash,
  createEditorialCatalogLoader,
  findEditorialEntry,
  getEditorialPosts,
  isEditorialModelEnabled,
  toEditorialSitemapEntries,
} from "../lib/editorial-catalog.ts";
import { collectPublishedEditorialStories, getStoryByUuid, requestStoryblok, resolveStoryRouteRedirect } from "../lib/storyblok-data.ts";
import { STORYBLOK_LOCALES } from "../lib/storyblok-locales.ts";

const require = createRequire(import.meta.url);
const { makeEditorialFixtures, representEditorialFixture } = require("./integration/editorial-fixtures.js");
const clone = (value) => structuredClone(value);
const hrefEn = "/posts/editorial-fixture";
const hrefEs = "/es-co/posts/editorial-fixture-es";
function fixtureCatalog(options = {}) {
  const f = makeEditorialFixtures();
  const catalog = buildEditorialCatalog({
    stories: [f.en, f.es], spanishStories: [f.representationEs],
    categories: [f.categoryEn, f.categoryEs], ...options,
  });
  return { f, catalog };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("editorial gate: server opt-in is exact, private and required in every environment", () => {
  assert.equal(isEditorialModelEnabled({}), false);
  for (const value of ["false", "1", "TRUE", "true ", ""]) {
    assert.equal(isEditorialModelEnabled({ STORYBLOK_FIELD_TRANSLATION_ENABLED: value }), false);
  }
  assert.equal(isEditorialModelEnabled({ NEXT_PUBLIC_STORYBLOK_FIELD_TRANSLATION_ENABLED: "true" }), false);
  assert.equal(isEditorialModelEnabled({ STORYBLOK_FIELD_TRANSLATION_ENABLED: "true" }), true);
  assert.equal(isEditorialModelEnabled({ STORYBLOK_FIELD_TRANSLATION_ENABLED: "true", VERCEL_ENV: "preview" }), true);
  assert.equal(isEditorialModelEnabled({ VERCEL_ENV: "production" }), false);
  assert.equal(isEditorialModelEnabled({ STORYBLOK_FIELD_TRANSLATION_ENABLED: "true", VERCEL_ENV: "production" }), true);
});

test("editorial approval: visible CDA values match the independently owned review commitment", () => {
  const f = makeEditorialFixtures();
  assert.equal(calculateEditorialApprovalHash(f.en, f.spanishText), f.en.content.es_approved_hash);
  assert.match(f.en.content.es_approved_hash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(f.en, "published"), false);
  assert.ok(!Object.keys(f.en.content).some((key) => key.includes("__i18n__")));
});

test("editorial locale contracts distinguish public/CDA codes from native MAPI suffixes", () => {
  assert.deepEqual(STORYBLOK_LOCALES.en, { cdaLanguage: undefined, mapiSuffix: null });
  assert.deepEqual(STORYBLOK_LOCALES["es-co"], { cdaLanguage: "es-co", mapiSuffix: "es_co" });
});

for (const field of ["title", "intro", "content"]) {
  test(`editorial approval: changing EN ${field} invalidates the review`, () => {
    const f = makeEditorialFixtures();
    const changed = clone(f.en);
    changed.content[field] += " changed";
    assert.notEqual(calculateEditorialApprovalHash(changed, f.spanishText), f.en.content.es_approved_hash);
  });
  test(`editorial approval: changing ES ${field} invalidates the review`, () => {
    const f = makeEditorialFixtures();
    assert.notEqual(calculateEditorialApprovalHash(f.en, { ...f.spanishText, [field]: f.spanishText[field] + " cambiado" }), f.en.content.es_approved_hash);
  });
}

test("editorial approval: identity, slugs and category are bound to the review", () => {
  const f = makeEditorialFixtures();
  const variants = [
    { ...f.en, id: 820001 },
    { ...f.en, uuid: "99999999-9999-4999-8999-999999999999" },
    { ...f.en, slug: "different-en", full_slug: "posts/different-en" },
    { ...f.en, content: { ...f.en.content, slug_es: "otro-es" } },
    { ...f.en, content: { ...f.en.content, category_ref: { ...f.en.content.category_ref, id: f.ids.categoryEs } } },
  ];
  for (const changed of variants) assert.notEqual(calculateEditorialApprovalHash(changed, f.spanishText), f.en.content.es_approved_hash);
});

test("editorial raw review: native es_co is explicit and es-co aliases never substitute it", () => {
  const f = makeEditorialFixtures();
  const raw = clone(f.en);
  Object.assign(raw, { published: false, published_at: null });
  for (const field of ["title", "intro", "content"]) {
    raw.content[field + "__i18n__es_co"] = f.spanishText[field];
    raw.content[field + "__i18n__es-co"] = "Wrong alias that must never win";
  }
  assert.equal(calculateDraftEditorialApprovalHash(raw), f.en.content.es_approved_hash);
  for (const field of ["title", "intro", "content"]) delete raw.content[field + "__i18n__es_co"];
  assert.equal(calculateDraftEditorialApprovalHash(raw), null);
});

test("editorial catalog: one published bilingual identity preserves both historical URLs", () => {
  const { f, catalog } = fixtureCatalog();
  assert.equal(catalog.entries.length, 2);
  assert.deepEqual(catalog.entries.map((entry) => entry.href).sort(), [hrefEn, hrefEs].sort());
  const en = findEditorialEntry(catalog, hrefEn);
  const es = findEditorialEntry(catalog, hrefEs);
  assert.equal(en.uuid, f.ids.en);
  assert.equal(es.uuid, f.ids.en);
  assert.equal(en.model, "field");
  assert.equal(es.model, "field");
  assert.equal(en.story.content.title, f.en.content.title);
  assert.equal(es.story.content.title, f.spanishText.title);
  assert.equal(es.story.content.content, f.spanishText.content);
  assert.equal(f.representationEs.full_slug, `es-co/${f.en.full_slug}`);
  assert.equal(f.representationEs.lang, "es-co");
  assert.equal(es.story.full_slug, f.en.full_slug);
  assert.ok(!catalog.entries.some((entry) => entry.uuid === f.ids.es));
  assert.deepEqual(es.localizedUrls, en.localizedUrls);
  assert.deepEqual(new Set(es.localizedUrls.map((url) => url.href)), new Set([hrefEn, hrefEs]));
});

test("editorial projection: list, detail, metadata URLs and sitemap derive from the same identity", () => {
  const { f, catalog } = fixtureCatalog();
  const spanishPosts = getEditorialPosts(catalog, "es-co");
  assert.equal(spanishPosts.length, 1);
  assert.equal(spanishPosts[0].uuid, f.ids.en);
  assert.equal(spanishPosts[0].content.content, findEditorialEntry(catalog, hrefEs).story.content.content);
  const sitemap = toEditorialSitemapEntries(catalog);
  assert.equal(sitemap.length, 2);
  assert.equal(new Set(sitemap.map((entry) => entry.url.href)).size, 2);
  for (const entry of sitemap) assert.deepEqual(new Set(entry.alternates.map((url) => url.href)), new Set([hrefEn, hrefEs]));
});

test("editorial redirects: wrong-locale aliases preserve scalar and repeated query parameters", async () => {
  const { catalog } = fixtureCatalog();
  const searchParams = { ref: "owned", tag: ["a", "b"] };
  const previous = {
    STORYBLOK_FIELD_TRANSLATION_ENABLED: process.env.STORYBLOK_FIELD_TRANSLATION_ENABLED,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  process.env.STORYBLOK_FIELD_TRANSLATION_ENABLED = "true";
  process.env.VERCEL_ENV = "preview";
  try {
    const spanish = await resolveStoryRouteRedirect({
      story: findEditorialEntry(catalog, hrefEn).story,
      locale: "es-co", version: "published", searchParams,
    });
    assert.equal(spanish, hrefEs + "?ref=owned&tag=a&tag=b");
    const english = await resolveStoryRouteRedirect({
      story: findEditorialEntry(catalog, hrefEs).story,
      locale: "en", version: "published", searchParams,
    });
    assert.equal(english, hrefEn + "?ref=owned&tag=a&tag=b");
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("editorial categories: shared EN UUID resolves to reciprocal legacy ES category", () => {
  const { f, catalog } = fixtureCatalog();
  assert.equal(findEditorialEntry(catalog, hrefEn).categoryUuid, f.ids.categoryEn);
  assert.equal(findEditorialEntry(catalog, hrefEs).categoryUuid, f.ids.categoryEs);
  assert.equal(getEditorialPosts(catalog, "en", "editorial-category").length, 1);
  assert.equal(getEditorialPosts(catalog, "es-co", "categoria-editorial").length, 1);
  assert.equal(getEditorialPosts(catalog, "es-co", "editorial-category").length, 0);
  assert.equal(getEditorialPosts(catalog, "es-co", "unknown").length, 0);
});

for (const [label, alter] of [
  ["absent representation", () => []],
  ["partial translation", (f) => { delete f.representationEs.content.intro; return [f.representationEs]; }],
  ["blank translation", (f) => { f.representationEs.content.content = "  "; return [f.representationEs]; }],
  ["English fallback", (f) => { for (const key of ["title", "intro", "content"]) f.representationEs.content[key] = f.en.content[key]; return [f.representationEs]; }],
  ["stale translated value", (f) => { f.representationEs.content.title += " changed"; return [f.representationEs]; }],
  ["wrong UUID", (f) => { f.representationEs.uuid = f.ids.draft; return [f.representationEs]; }],
  ["wrong ID", (f) => { f.representationEs.id = 910000; return [f.representationEs]; }],
  ["wrong native slug", (f) => { f.representationEs.slug = "other-article"; return [f.representationEs]; }],
  ["explicit unpublished ES", (f) => { f.representationEs.published = false; return [f.representationEs]; }],
]) {
  test(`editorial rejection: ${label} retains Spanish legacy content`, () => {
    const f = makeEditorialFixtures();
    const spanishStories = alter(f);
    const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories });
    const es = findEditorialEntry(catalog, hrefEs);
    assert.equal(es.model, "legacy");
    assert.equal(es.uuid, f.ids.es);
    assert.equal(es.story.content.title, f.es.content.title);
    assert.notEqual(es.story.content.title, f.en.content.title);
  });
}

test("editorial rejection: English fallback with valid identity and prefixed path fails the review hash", () => {
  const f = makeEditorialFixtures();
  for (const key of ["title", "intro", "content"]) f.representationEs.content[key] = f.en.content[key];
  const catalog = buildEditorialCatalog({ stories: [f.en], spanishStories: [f.representationEs] });
  assert.ok(catalog.diagnostics.includes("STALE_APPROVAL"));
  assert.equal(findEditorialEntry(catalog, hrefEs), null);
  assert.deepEqual(toEditorialSitemapEntries(catalog).map((entry) => entry.url.href), [hrefEn]);
});

for (const fullSlug of [
  "posts/editorial-fixture", "es_co/posts/editorial-fixture", "fr/posts/editorial-fixture",
  "es-co/es-co/posts/editorial-fixture", "/es-co/posts/editorial-fixture", "es-co/posts/editorial-fixture/",
  "es-co/posts/editorial-fixture?ref=other", "es-co/posts/editorial-fixture#other",
  "es-co/posts/%65ditorial-fixture", "es-co/posts/../editorial-fixture", "es-co/posts%2feditorial-fixture",
  "es-co\\posts\\editorial-fixture", "es-co//posts/editorial-fixture", "es-co/posts/editorial-fixture\n",
]) {
  test(`editorial rejection: unexpected or malformed localized full_slug ${JSON.stringify(fullSlug)}`, () => {
    const f = makeEditorialFixtures();
    f.representationEs.full_slug = fullSlug;
    const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
    assert.ok(catalog.diagnostics.includes("INVALID_ES_REPRESENTATION"));
    assert.equal(findEditorialEntry(catalog, hrefEs).uuid, f.ids.es);
    assert.equal(findEditorialEntry(catalog, hrefEs).model, "legacy");
    assert.ok(!catalog.entries.some((entry) => entry.model === "field"));
    assert.equal(new Set(toEditorialSitemapEntries(catalog).map((entry) => entry.url.href)).size, 2);
  });
}

for (const [label, value] of [["false", false], ["missing", undefined], ["string true", "true"]]) {
  test(`editorial approval gate: ${label} cannot adopt a field translation`, () => {
    const f = makeEditorialFixtures();
    f.en.content.es_translation_approved = value;
    f.representationEs.content.es_translation_approved = value;
    const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
    assert.equal(findEditorialEntry(catalog, hrefEs).uuid, f.ids.es);
  });
}

test("editorial approval gate: stale or malformed hash never adopts ES", () => {
  for (const value of ["", "f".repeat(64), "A".repeat(64), "x".repeat(100)]) {
    const f = makeEditorialFixtures();
    f.en.content.es_approved_hash = value;
    f.representationEs.content.es_approved_hash = value;
    const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
    assert.equal(findEditorialEntry(catalog, hrefEs).uuid, f.ids.es);
  }
});

test("editorial draft isolation: null publication or explicit false never creates a route", () => {
  for (const variant of [{ published: false }, { published_at: null }, { published_at: "invalid" }]) {
    const f = makeEditorialFixtures();
    Object.assign(f.en, variant);
    const catalog = buildEditorialCatalog({ stories: [f.en], spanishStories: [f.representationEs] });
    assert.equal(findEditorialEntry(catalog, hrefEn), null);
    assert.equal(findEditorialEntry(catalog, hrefEs), null);
    assert.equal(toEditorialSitemapEntries(catalog).length, 0);
  }
});

test("editorial completeness: missing ES with no legacy never invents an English fallback route", () => {
  const f = makeEditorialFixtures();
  const catalog = buildEditorialCatalog({ stories: [f.en], spanishStories: [] });
  assert.equal(findEditorialEntry(catalog, hrefEs), null);
  assert.equal(findEditorialEntry(catalog, hrefEn).story.content.title, f.en.content.title);
  assert.deepEqual(toEditorialSitemapEntries(catalog).map((entry) => entry.url.href), [hrefEn]);
});

test("editorial collisions: unrelated legacy occupant keeps ownership of its historical URL", () => {
  const f = makeEditorialFixtures();
  f.es.group_id = "unrelated-group";
  f.es.alternates = [];
  const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
  assert.equal(findEditorialEntry(catalog, hrefEs).uuid, f.ids.es);
  assert.equal(findEditorialEntry(catalog, hrefEs).model, "legacy");
});

test("editorial collisions: duplicate source identities and duplicate legacy URLs are rejected", () => {
  const f = makeEditorialFixtures();
  const differentPath = { ...clone(f.en), slug: "second-path", full_slug: "posts/second-path" };
  assert.throws(() => buildEditorialCatalog({ stories: [f.en, differentPath] }));
  const differentIdentity = { ...clone(f.en), id: 910001, uuid: f.ids.draft };
  assert.throws(() => buildEditorialCatalog({ stories: [f.en, differentIdentity] }));
});

test("editorial collisions: two valid identities claiming the same ES slug retain legacy ownership", () => {
  const f = makeEditorialFixtures();
  const other = clone(f.en);
  Object.assign(other, { id: 830001, uuid: "77777777-7777-4777-8777-777777777777", slug: "second-editorial", full_slug: "posts/second-editorial", alternates: [] });
  other.content.es_approved_hash = calculateEditorialApprovalHash(other, f.spanishText);
  const translatedOther = clone(other);
  Object.assign(translatedOther.content, f.spanishText);
  translatedOther.full_slug = `es-co/${other.full_slug}`;
  const catalog = buildEditorialCatalog({ stories: [f.en, f.es, other], spanishStories: [f.representationEs, translatedOther] });
  assert.equal(findEditorialEntry(catalog, hrefEs).uuid, f.ids.es);
  assert.ok(catalog.entries.every((entry) => entry.model === "legacy"));
});

test("editorial snapshot: an unrelated latest-draft flag does not erase a reviewed published payload", () => {
  const f = makeEditorialFixtures();
  f.en.unpublished_changes = true;
  const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
  assert.equal(findEditorialEntry(catalog, hrefEs).model, "field");
});

test("editorial projection does not mutate upstream records or allow consumers to mutate later reads", () => {
  const f = makeEditorialFixtures();
  const before = clone(f);
  const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
  assert.deepEqual(f, before);
  const first = findEditorialEntry(catalog, hrefEs);
  first.story.content.title = "mutated consumer";
  first.localizedUrls.length = 0;
  const next = findEditorialEntry(catalog, hrefEs);
  assert.equal(next.story.content.title, f.spanishText.title);
  assert.equal(next.localizedUrls.length, 2);
});

test("editorial slug validation: malformed ES leaf never becomes a route", () => {
  for (const slug of ["bad\n", "../escape", "two/parts", "space here", "BadCase", "encoded%2fslash", "a".repeat(161)]) {
    const f = makeEditorialFixtures();
    f.en.content.slug_es = slug;
    f.representationEs.content.slug_es = slug;
    const catalog = buildEditorialCatalog({ stories: [f.en, f.es], spanishStories: [f.representationEs] });
    assert.ok(!catalog.entries.some((entry) => entry.model === "field"));
  }
});

test("editorial compatibility: all 30 owned legacy URLs remain distinct and navigable", () => {
  const f = makeEditorialFixtures();
  const stories = [];
  const paths = [];
  for (let index = 1; index <= 15; index++) {
    const en = clone(f.en);
    const es = clone(f.es);
    Object.assign(en, { id: 820000 + index * 2, uuid: `50000000-0000-4000-8000-${String(index * 2).padStart(12, "0")}`, slug: `legacy-en-${index}`, full_slug: `posts/legacy-en-${index}`, group_id: `owned-pair-${index}` });
    Object.assign(es, { id: en.id + 1, uuid: `50000000-0000-4000-8000-${String(index * 2 + 1).padStart(12, "0")}`, slug: `legacy-es-${index}`, full_slug: `posts/legacy-es-${index}`, group_id: en.group_id });
    delete en.content.slug_es;
    delete en.content.es_translation_approved;
    delete en.content.es_approved_hash;
    en.alternates = [{ id: es.id, full_slug: es.full_slug, published: true }];
    es.alternates = [{ id: en.id, full_slug: en.full_slug, published: true }];
    stories.push(en, es);
    paths.push(`/${en.full_slug}`, `/es-co/${es.full_slug}`);
  }
  const catalog = buildEditorialCatalog({ stories });
  assert.equal(catalog.entries.length, 30);
  assert.deepEqual(catalog.entries.map((entry) => entry.href).sort(), paths.sort());
  for (const href of paths) {
    const entry = findEditorialEntry(catalog, href);
    assert.ok(entry);
    assert.equal(entry.localizedUrls.length, 2);
  }
});

test("editorial cache: cold reads coalesce, warm reads use TTL, and expired data reloads", async () => {
  let clock = 0;
  let calls = 0;
  const gate = deferred();
  const { catalog } = fixtureCatalog();
  const loader = createEditorialCatalogLoader(async () => { calls++; return calls === 1 ? gate.promise : catalog; }, { now: () => clock, ttlMs: 10 });
  const first = loader.get();
  const second = loader.get();
  gate.resolve(catalog);
  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
  await loader.get();
  assert.equal(calls, 1);
  clock = 10;
  await loader.get();
  assert.equal(calls, 2);
});

test("editorial cache: failures are not cached and cold-start recovery needs a valid source", async () => {
  let broken = true;
  let calls = 0;
  const { catalog } = fixtureCatalog();
  const loader = createEditorialCatalogLoader(async () => { calls++; if (broken) throw new Error("owned upstream failure"); return catalog; });
  await assert.rejects(loader.get(), /owned upstream failure/);
  broken = false;
  assert.deepEqual(await loader.get(), catalog);
  assert.equal(calls, 2);
});

test("editorial cache: an outage cannot indefinitely serve an expired publication", async () => {
  let clock = 0;
  let broken = false;
  const { catalog } = fixtureCatalog();
  const loader = createEditorialCatalogLoader(async () => { if (broken) throw new Error("owned outage"); return catalog; }, { now: () => clock, ttlMs: 5 });
  await loader.get();
  clock = 5;
  broken = true;
  await assert.rejects(loader.get(), /owned outage/);
  broken = false;
  assert.deepEqual(await loader.get(), catalog);
});

test("editorial cache: invalidation prevents old in-flight results replacing a new generation", async () => {
  const earlier = deferred();
  const { catalog } = fixtureCatalog();
  const updated = clone(catalog);
  updated.diagnostics.push("new generation");
  let calls = 0;
  const loader = createEditorialCatalogLoader(async () => ++calls === 1 ? earlier.promise : updated);
  const old = loader.get();
  loader.invalidate();
  assert.deepEqual(await loader.get(), updated);
  earlier.resolve(catalog);
  await old;
  assert.deepEqual(await loader.get(), updated);
});

test("editorial cache: callers cannot change the cached publication through a returned object", async () => {
  const { catalog } = fixtureCatalog();
  const loader = createEditorialCatalogLoader(async () => catalog);
  const first = await loader.get();
  first.entries[0].story.content.title = "mutated cache consumer";
  first.entries.length = 0;
  const next = await loader.get();
  assert.equal(next.entries.length, 2);
  assert.notEqual(next.entries[0].story.content.title, "mutated cache consumer");
});

async function withSyntheticTokens(run) {
  const names = ["STORYBLOK_TOKEN", "STORYBLOK_PREVIEW_TOKEN", "NEXT_PUBLIC_STORYBLOK_TOKEN"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.STORYBLOK_TOKEN = "owned-editorial-public-token";
  process.env.STORYBLOK_PREVIEW_TOKEN = "owned-editorial-private-token";
  process.env.NEXT_PUBLIC_STORYBLOK_TOKEN = "owned-editorial-public-client-token";
  try { await run(); } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

test("editorial UUID transport: EN omits language and CDA ES uses es-co, without fallback_lang", async () => withSyntheticTokens(async () => {
  const f = makeEditorialFixtures();
  const seen = [];
  for (const locale of ["en", "es-co"]) {
    await getStoryByUuid({ uuid: f.ids.en, version: "published", locale, fetchImpl: async (url, options) => {
      seen.push({ url: new URL(url), options });
      return Response.json({ story: representEditorialFixture(f, f.en, new URL(url).searchParams.get("language")) });
    } });
  }
  assert.equal(seen[0].url.searchParams.has("language"), false);
  assert.equal(seen[1].url.searchParams.get("language"), "es-co");
  for (const request of seen) {
    assert.equal(request.url.searchParams.get("find_by"), "uuid");
    assert.equal(request.url.searchParams.get("version"), "published");
    assert.equal(request.url.searchParams.has("fallback_lang"), false);
    assert.equal(request.options.cache, "force-cache");
  }
}));

test("editorial CDA regression: es-co yields reviewed ES but es_co returns English and cannot create an ES route", async () => withSyntheticTokens(async () => {
  const f = makeEditorialFixtures();
  const fetchImpl = async (url) => Response.json({ story: representEditorialFixture(f, f.en, new URL(url).searchParams.get("language")) });
  const correct = await getStoryByUuid({ uuid: f.ids.en, version: "published", locale: "es-co", fetchImpl });
  for (const key of ["title", "intro", "content"]) assert.equal(correct.story.content[key], f.spanishText[key]);
  assert.equal(findEditorialEntry(buildEditorialCatalog({ stories: [f.en], spanishStories: [correct.story] }), hrefEs).uuid, f.ids.en);

  const fallback = await requestStoryblok(`stories/${f.ids.en}`, { version: "published", params: { find_by: "uuid", language: "es_co" }, fetchImpl });
  for (const key of ["title", "intro", "content"]) assert.equal(fallback.story.content[key], f.en.content[key]);
  const catalog = buildEditorialCatalog({ stories: [f.en], spanishStories: [fallback.story] });
  assert.equal(findEditorialEntry(catalog, hrefEs), null);
  assert.ok(catalog.entries.every((entry) => entry.model === "legacy"));
}));

test("editorial UUID transport: missing private draft credentials fails before any request", async () => withSyntheticTokens(async () => {
  delete process.env.STORYBLOK_PREVIEW_TOKEN;
  let calls = 0;
  await assert.rejects(getStoryByUuid({ uuid: makeEditorialFixtures().ids.en, version: "draft", locale: "es-co", fetchImpl: async () => { calls++; return Response.json({}); } }), (error) => error.code === "MISSING_TOKEN");
  assert.equal(calls, 0);
}));

test("editorial UUID transport: authenticated caller's draft transport is no-store and separate", async () => withSyntheticTokens(async () => {
  const f = makeEditorialFixtures();
  assert.equal(Object.hasOwn(f.draft, "published"), false);
  assert.equal(f.draft.published_at, null);
  await getStoryByUuid({ uuid: f.ids.draft, version: "draft", locale: "es-co", fetchImpl: async (url, options) => {
    const request = new URL(url);
    assert.equal(request.searchParams.get("version"), "draft");
    assert.equal(request.searchParams.get("token"), "owned-editorial-private-token");
    assert.equal(request.searchParams.get("language"), "es-co");
    assert.equal(options.cache, "no-store");
    assert.equal(options.next, undefined);
    return Response.json({ story: f.draft });
  } });
}));

test("editorial published collection: raw mixed pages are exhausted before any language filtering", async () => withSyntheticTokens(async () => {
  const f = makeEditorialFixtures();
  const first = Array.from({ length: 100 }, (_value, index) => clone(index % 2 ? f.categoryEn : f.en));
  const requested = [];
  const stories = await collectPublishedEditorialStories(async (url, options) => {
    const request = new URL(url);
    const page = Number(request.searchParams.get("page"));
    requested.push(page);
    assert.equal(request.searchParams.get("version"), "published");
    assert.equal(request.searchParams.get("per_page"), "100");
    assert.equal(request.searchParams.has("language"), false);
    assert.equal(request.searchParams.has("filter_query[language][in]"), false);
    assert.equal(request.searchParams.has("fallback_lang"), false);
    assert.equal(options.cache, "force-cache");
    return Response.json({ stories: page === 1 ? first : [f.es] });
  });
  assert.deepEqual(requested, [1, 2]);
  assert.equal(stories.length, 101);
  assert.equal(stories.at(-1).uuid, f.ids.es);
}));

test("editorial published collection: malformed upstream response cannot become an empty catalog", async () => withSyntheticTokens(async () => {
  await assert.rejects(collectPublishedEditorialStories(async () => Response.json({ stories: null })), /INVALID_PUBLISHED_PAGE/);
}));

test("editorial UUID transport: invalid identifiers are rejected before network access", async () => withSyntheticTokens(async () => {
  for (const uuid of ["../private", "bad\n", "", "https://other.invalid/story", makeEditorialFixtures().ids.en + "/extra"]) {
    let calls = 0;
    await assert.rejects(getStoryByUuid({ uuid, version: "published", fetchImpl: async () => { calls++; return Response.json({}); } }), (error) => error.code === "INVALID_REQUEST");
    assert.equal(calls, 0);
  }
}));

test("editorial UUID transport: an unexpected identity or draft in a published response fails closed", async () => withSyntheticTokens(async () => {
  const f = makeEditorialFixtures();
  for (const story of [{ ...clone(f.en), uuid: f.ids.es }, { ...clone(f.en), published_at: null }, { ...clone(f.en), published: false }]) {
    await assert.rejects(getStoryByUuid({ uuid: f.ids.en, version: "published", fetchImpl: async () => Response.json({ story }) }), (error) => error.code === "INVALID_RESPONSE");
  }
}));
