import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateEsApprovalHash } from "../scripts/pilots/slug-es-routing.mjs";
import {
  collectPilotPublishedPages,
  createIntegratedSlugEsPilot,
  PilotCatalogUnavailable,
} from "../scripts/pilots/slug-es-integrated.mjs";

// Local, owned, synthetic snapshots only. These are not CDA responses, a CMS
// backup, proof of field persistence, or proof of Next/Vercel cache behaviour.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/slug-es-pilot.json", import.meta.url), "utf8"));
const ORIGIN = "https://www.jhonattan.dev";
const SOURCE_KIND = "synthetic-reviewed-snapshot";
const clone = (value) => structuredClone(value);
const page = (stories, total = stories.length) => ({ sourceKind: SOURCE_KIND, stories: clone(stories), total });
function approvedInput() {
  const input = clone(fixture.fieldInput);
  input.baseStory.content.es_approved_hash = calculateEsApprovalHash(input);
  return input;
}
function setup(overrides = {}) {
  const input = approvedInput();
  const stories = [clone(input.baseStory), clone(fixture.legacyEs)];
  const pilot = createIntegratedSlugEsPilot({
    loadPublishedPage: async () => page(stories),
    loadCandidates: async () => [clone(input)],
    ...overrides,
  });
  return { input, stories, pilot };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function categories() {
  const en = { id: 970001, uuid: "synthetic-category-en", group_id: "synthetic-category-pair", published: true,
    full_slug: "categories/synthetic-en", content: { component: "Category", language: "english" },
    alternates: [{ id: 970002, full_slug: "categories/sintetica-es", published: true }] };
  const es = { id: 970002, uuid: "synthetic-category-es", group_id: en.group_id, published: true,
    full_slug: "categories/sintetica-es", content: { component: "Category", language: "spanish" },
    alternates: [{ id: en.id, full_slug: en.full_slug, published: true }] };
  return [en, es];
}

test("integrated A: detail, list, identity, language links and SEO share both historical paths", async () => {
  const { pilot } = setup();
  const expectedLanguages = Object.fromEntries(Object.entries(fixture.historicalPaths).map(([locale, href]) => [locale, ORIGIN + href]));
  for (const locale of ["en", "es-co"]) {
    const href = fixture.historicalPaths[locale];
    const detail = await pilot.resolve(href);
    assert.equal(detail.uuid, fixture.legacyEn.uuid);
    assert.equal(detail.id, fixture.legacyEn.id);
    assert.equal(detail.model, "field");
    assert.equal(detail.locale, locale);
    assert.equal(detail.content, locale === "en" ? fixture.legacyEn.content.content : fixture.legacyEs.content.content);
    assert.deepEqual(await pilot.list(locale), [detail]);
    assert.deepEqual(await pilot.metadata(href), { canonical: ORIGIN + href, languages: expectedLanguages });
    assert.deepEqual(Object.fromEntries(detail.localizedUrls.map((url) => [url.locale, ORIGIN + url.href])), expectedLanguages);
  }
  const sitemap = await pilot.sitemap();
  assert.equal(sitemap.length, 2);
  assert.deepEqual(sitemap.map((row) => row.url).sort(), Object.values(expectedLanguages).sort());
  for (const row of sitemap) assert.deepEqual(row.alternates.languages, expectedLanguages);
});

test("integrated A: unknown paths, guessed slugs and unsupported locales never acquire a route", async () => {
  const { pilot } = setup();
  for (const path of ["/posts/missing", "/es-co/posts/black-box-abstraction-thinking-in-boxes", fixture.historicalPaths["es-co"] + "?draft=1", "//other.invalid/posts/a", "/es-co/posts/a%2fb"]) {
    assert.equal(await pilot.resolve(path), null);
    assert.equal(await pilot.metadata(path), null);
  }
  assert.deepEqual(await pilot.list("fr"), []);
});

test("integrated A: pagination completes raw mixed batches before post/locale filtering", async () => {
  const input = approvedInput();
  const ignored = { id: 990001, uuid: "synthetic-other-component", published: true, content: { component: "page" } };
  const calls = [];
  const pilot = createIntegratedSlugEsPilot({ pageSize: 2,
    loadPublishedPage: async (request) => {
      calls.push(request);
      return request.page === 1 ? page([input.baseStory, ignored], 3) : page([fixture.legacyEs], 3);
    },
    loadCandidates: async (all) => { assert.equal(all.length, 3); return [input]; },
  });
  assert.equal((await pilot.list("es-co"))[0].uuid, fixture.legacyEn.uuid);
  assert.deepEqual(calls, [{ page: 1, perPage: 2, version: "published" }, { page: 2, perPage: 2, version: "published" }]);
});

test("integrated A: 15 owned pairs preserve all 30 exact paths and unique indexable URLs", async () => {
  const input = approvedInput();
  const stories = [input.baseStory, clone(fixture.legacyEs)];
  for (let index = 1; index < 15; index++) {
    const en = clone(fixture.legacyEn);
    const es = clone(fixture.legacyEs);
    Object.assign(en, { id: 980000 + index * 2, uuid: `synthetic-integrated-en-${index}`, group_id: `synthetic-integrated-pair-${index}`, slug: `article-${index}`, full_slug: `posts/article-${index}` });
    Object.assign(es, { id: en.id + 1, uuid: `synthetic-integrated-es-${index}`, group_id: en.group_id, slug: `articulo-${index}`, full_slug: `posts/articulo-${index}` });
    en.alternates = [{ id: es.id, full_slug: es.full_slug, published: true }];
    es.alternates = [{ id: en.id, full_slug: en.full_slug, published: true }];
    stories.push(en, es);
  }
  const expected = stories.map((story) => `${ORIGIN}${story.content.language === "spanish" ? "/es-co" : ""}/${story.full_slug}`).sort();
  const pilot = createIntegratedSlugEsPilot({ pageSize: 7,
    loadPublishedPage: async ({ page: number, perPage }) => page(stories.slice((number - 1) * perPage, number * perPage), stories.length),
    loadCandidates: async () => [input],
  });
  const urls = (await pilot.sitemap()).map((row) => row.url).sort();
  assert.deepEqual(urls, expected);
  assert.equal(new Set(urls).size, 30);
  assert.equal((await pilot.list("en")).length, 15);
  assert.equal((await pilot.list("es-co")).length, 15);
  assert.equal((await pilot.getCatalog()).entries.filter((row) => row.uuid === fixture.legacyEn.uuid).length, 2);
  assert.equal((await pilot.getCatalog()).entries.filter((row) => row.uuid === fixture.legacyEs.uuid).length, 0);
});

for (const [name, mutate] of [
  ["missing localized title", (input) => { delete input.baseStory.content[input.localizedFields.title]; }],
  ["partial localized body", (input) => { input.baseStory.content[input.localizedFields.content] = " "; }],
  ["stale approval", (input) => { input.baseStory.content[input.localizedFields.content] += " changed"; }],
  ["unapproved", (input) => { input.baseStory.content.es_translation_approved = false; }],
  ["unpublished translation", (input) => { input.publication.localePublished = false; }],
  ["invalid Spanish slug", (input) => { input.baseStory.content.slug_es = "../escape"; }],
]) {
  test(`integrated A: ${name} preserves independent legacy Spanish content and language links`, async () => {
    const input = approvedInput();
    mutate(input);
    const pilot = createIntegratedSlugEsPilot({
      loadPublishedPage: async () => page([input.baseStory, fixture.legacyEs]),
      loadCandidates: async () => [input],
    });
    const detail = await pilot.resolve(fixture.historicalPaths["es-co"]);
    assert.equal(detail.uuid, fixture.legacyEs.uuid);
    assert.equal(detail.model, "legacy");
    assert.equal(detail.content, fixture.legacyEs.content.content);
    assert.equal(detail.localizedUrls.length, 2);
    assert.equal((await pilot.sitemap()).length, 2);
  });
}

test("integrated A: duplicate candidate identities do not choose a last winner", async () => {
  const input = approvedInput();
  const { pilot } = setup({ loadCandidates: async () => [input, clone(input)] });
  assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).uuid, fixture.legacyEs.uuid);
  assert.ok((await pilot.getCatalog()).diagnostics.some((row) => row.code === "DUPLICATE_CANDIDATE_IDENTITY"));
});

test("integrated A: unrelated legacy Spanish ownership cannot be hijacked", async () => {
  const input = approvedInput();
  const spanish = clone(fixture.legacyEs);
  spanish.group_id = "synthetic-unrelated-pair";
  const { pilot } = setup({ loadPublishedPage: async () => page([input.baseStory, spanish]) });
  const detail = await pilot.resolve(fixture.historicalPaths["es-co"]);
  assert.equal(detail.uuid, spanish.uuid);
  assert.equal(detail.model, "legacy");
  assert.ok((await pilot.getCatalog()).diagnostics.some((row) => row.code === "LEGACY_SLUG_COLLISION"));
});

test("integrated A: categories resolve shared UUID through reciprocal published legacy identity", async () => {
  const categoryStories = categories();
  const { pilot } = setup({ loadCategories: async () => categoryStories });
  assert.equal((await pilot.resolve(fixture.historicalPaths.en)).categoryUuid, "synthetic-category-en");
  assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).categoryUuid, "synthetic-category-es");
  assert.equal((await pilot.list("es-co", { categoryUuid: "synthetic-category-es" })).length, 1);
  assert.equal((await pilot.list("es-co", { categoryUuid: "synthetic-category-en" })).length, 0);
});

test("integrated A: missing reciprocal category relationship never guesses by cached_url", async () => {
  const categoryStories = categories();
  categoryStories[1].alternates = [];
  const { pilot } = setup({ loadCategories: async () => categoryStories });
  assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).categoryUuid, null);
  assert.deepEqual(await pilot.list("es-co", { categoryUuid: "synthetic-category-es" }), []);
});

test("integrated A: null inventory and category rows do not crash otherwise valid routes", async () => {
  const input = approvedInput();
  const { pilot } = setup({
    loadPublishedPage: async () => page([null, input.baseStory, fixture.legacyEs]),
    loadCategories: async () => [null, ...categories()],
  });
  const detail = await pilot.resolve(fixture.historicalPaths["es-co"]);
  assert.equal(detail.uuid, fixture.legacyEn.uuid);
  assert.equal(detail.categoryUuid, "synthetic-category-es");
  assert.equal((await pilot.sitemap()).length, 2);
});

for (const [label, value] of [["array-like object", { length: 1 }], ["missing first element", [null]], ["sparse array", new Array(1)]]) {
  test(`integrated A: malformed category alternate ${label} cannot crash or invent a category`, async () => {
    const categoryStories = categories();
    categoryStories[1].alternates = value;
    const { pilot } = setup({ loadCategories: async () => categoryStories });
    assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).categoryUuid, null);
    assert.equal((await pilot.sitemap()).length, 2);
  });
}

test("integrated A: warm cache shares a snapshot, expiration refreshes using an injected clock", async () => {
  let clock = 1000;
  let loads = 0;
  const { pilot } = setup({ now: () => clock, ttlMs: 100,
    loadPublishedPage: async () => { loads++; const input = approvedInput(); return page([input.baseStory, fixture.legacyEs]); },
  });
  await pilot.resolve(fixture.historicalPaths.en);
  clock = 1099;
  await Promise.all([pilot.list("es-co"), pilot.metadata(fixture.historicalPaths.en), pilot.sitemap()]);
  assert.equal(loads, 1);
  clock = 1100;
  await pilot.getCatalog();
  assert.equal(loads, 2);
});

test("integrated A: simultaneous cold consumers coalesce to one in-flight load", async () => {
  const gate = deferred();
  let loads = 0;
  const { pilot } = setup({ loadPublishedPage: async () => { loads++; return gate.promise; } });
  const consumers = [pilot.resolve(fixture.historicalPaths.en), pilot.list("es-co"), pilot.sitemap()];
  assert.equal(loads, 1);
  const input = approvedInput();
  gate.resolve(page([input.baseStory, fixture.legacyEs]));
  const [detail, listing, sitemap] = await Promise.all(consumers);
  assert.equal(detail.uuid, listing[0].uuid);
  assert.equal(sitemap.length, 2);
  assert.equal(loads, 1);
});

test("integrated A: consumers and loaders cannot mutate a shared cached snapshot", async () => {
  const input = approvedInput();
  const source = [input.baseStory, clone(fixture.legacyEs)];
  const before = clone(source);
  const { pilot } = setup({ loadPublishedPage: async () => page(source),
    loadCandidates: async (copy) => { copy[0].content.title = "mutated loader copy"; return [input]; },
  });
  const first = await pilot.getCatalog();
  first.entries[0].content = "mutated consumer";
  first.catalog.routes.length = 0;
  source[0].content.title = "mutated source later";
  const detail = await pilot.resolve(fixture.historicalPaths.en);
  assert.equal(detail.title, before[0].content.title);
  assert.equal(detail.content, before[0].content.content);
  assert.equal((await pilot.getCatalog()).catalog.routes.length, 2);
});

test("integrated A: invalidation prevents an older in-flight snapshot replacing a new generation", async () => {
  const gate = deferred();
  let loads = 0;
  const input = approvedInput();
  const original = page([input.baseStory, fixture.legacyEs]);
  const updated = clone(original);
  updated.stories[1].content.title = "Updated legacy title";
  const { pilot } = setup({ loadCandidates: async () => [],
    loadPublishedPage: async () => ++loads === 1 ? gate.promise : updated,
  });
  const earlierRequest = pilot.getCatalog();
  pilot.invalidate();
  const next = await pilot.getCatalog();
  gate.resolve(original);
  await earlierRequest;
  assert.equal(next.entries.find((row) => row.locale === "es-co").title, "Updated legacy title");
  assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).title, "Updated legacy title");
  assert.equal(loads, 2);
});

test("integrated A: cold upstream failure uses an independent fresh published legacy source", async () => {
  let fallbackCalls = 0;
  const { pilot } = setup({ loadPublishedPage: async () => { throw new Error("synthetic upstream failure"); },
    loadLegacyPublishedPage: async ({ version }) => { fallbackCalls++; assert.equal(version, "published"); return page([fixture.legacyEn, fixture.legacyEs]); },
  });
  assert.equal((await pilot.getCatalog()).mode, "legacy-fallback");
  const detail = await pilot.resolve(fixture.historicalPaths["es-co"]);
  assert.equal(detail.uuid, fixture.legacyEs.uuid);
  assert.equal(detail.content, fixture.legacyEs.content.content);
  assert.equal(fallbackCalls, 1);
});

test("integrated A: cold upstream failure without an independent snapshot fails closed", async () => {
  const { pilot } = setup({ loadPublishedPage: async () => { throw new Error("synthetic internal failure details"); } });
  await assert.rejects(pilot.getCatalog(), (error) => error instanceof PilotCatalogUnavailable && error.code === "PUBLISHED_SOURCE_UNAVAILABLE" && !error.message.includes("internal failure"));
  await assert.rejects(pilot.sitemap(), PilotCatalogUnavailable);
});

test("integrated A: contradictory snapshots cannot feed diagnostic routes to consumers", async () => {
  const input = approvedInput();
  const conflicting = clone(input.baseStory);
  conflicting.content.title += " conflict";
  const { pilot } = setup({ loadPublishedPage: async () => page([input.baseStory, conflicting, fixture.legacyEs]) });
  await assert.rejects(pilot.resolve(fixture.historicalPaths.en), (error) => error.code === "INVALID_PUBLISHED_SNAPSHOT");
  await assert.rejects(pilot.sitemap(), PilotCatalogUnavailable);
});

test("integrated A: malformed independent fallback also fails closed", async () => {
  const { pilot } = setup({ loadPublishedPage: async () => { throw new Error("synthetic outage"); },
    loadLegacyPublishedPage: async () => ({ sourceKind: "management-draft", stories: [fixture.legacyEn] }),
  });
  await assert.rejects(pilot.getCatalog(), (error) => error.code === "PUBLISHED_AND_LEGACY_UNAVAILABLE");
});

test("integrated A: expired cache is not served indefinitely during an outage, and a fresh source recovers", async () => {
  let clock = 0;
  let broken = false;
  const { pilot } = setup({ now: () => clock, ttlMs: 10,
    loadPublishedPage: async () => { if (broken) throw new Error("synthetic outage"); const input = approvedInput(); return page([input.baseStory, fixture.legacyEs]); },
  });
  await pilot.getCatalog();
  clock = 10;
  broken = true;
  await assert.rejects(pilot.resolve(fixture.historicalPaths["es-co"]), PilotCatalogUnavailable);
  broken = false;
  assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).uuid, fixture.legacyEn.uuid);
});

test("integrated A: candidate-source failure retains validated legacy content without English fallback", async () => {
  const { pilot } = setup({ loadCandidates: async () => { throw new Error("synthetic candidate failure"); } });
  assert.equal((await pilot.getCatalog()).mode, "legacy-fallback");
  const detail = await pilot.resolve(fixture.historicalPaths["es-co"]);
  assert.equal(detail.uuid, fixture.legacyEs.uuid);
  assert.equal(detail.content, fixture.legacyEs.content.content);
  assert.equal((await pilot.metadata(detail.href)).canonical, ORIGIN + fixture.historicalPaths["es-co"]);
});

test("integrated A: a draft cannot contaminate published catalog or sitemap", async () => {
  const draft = approvedInput();
  Object.assign(draft.baseStory, { id: 999001, uuid: "synthetic-draft", slug: "isolated-draft", full_slug: "posts/isolated-draft", published: false, unpublished_changes: true });
  draft.baseStory.content.slug_es = "borrador-aislado";
  const { pilot } = setup({ loadPublishedPage: async () => page([fixture.legacyEn, fixture.legacyEs, draft.baseStory]), loadCandidates: async () => [draft] });
  assert.equal(await pilot.resolve("/posts/isolated-draft"), null);
  assert.equal(await pilot.resolve("/es-co/posts/borrador-aislado"), null);
  assert.equal((await pilot.sitemap()).length, 2);
  assert.equal((await pilot.resolve(fixture.historicalPaths["es-co"])).uuid, fixture.legacyEs.uuid);
});

test("integrated A: publication source attestation is mandatory, not inferred from CDA shape", async () => {
  const { pilot } = setup({ loadPublishedPage: async () => ({ stories: [fixture.legacyEn, fixture.legacyEs], total: 2 }) });
  await assert.rejects(pilot.getCatalog(), (error) => error.code === "PUBLISHED_SOURCE_UNAVAILABLE");
});

for (const [label, loadPage, options, code] of [
  ["changed totals", async ({ page: number }) => page([fixture.legacyEn], number === 1 ? 2 : 3), { pageSize: 1 }, "INCONSISTENT_PAGINATION"],
  ["truncated batch", async () => page([fixture.legacyEn], 2), { pageSize: 2 }, "INCOMPLETE_PAGINATION"],
  ["too many rows", async () => page([fixture.legacyEn, fixture.legacyEs], 1), { pageSize: 2 }, "INCOMPLETE_PAGINATION"],
  ["overlong page", async () => page([fixture.legacyEn, fixture.legacyEs]), { pageSize: 1 }, "INVALID_PUBLISHED_PAGE"],
  ["unbounded pages", async () => ({ sourceKind: SOURCE_KIND, stories: [fixture.legacyEn] }), { pageSize: 1, maxPages: 2 }, "PAGE_LIMIT_EXCEEDED"],
]) {
  test(`integrated A pagination: ${label} cannot masquerade as a complete inventory`, async () => {
    await assert.rejects(collectPilotPublishedPages(loadPage, options), (error) => error.code === code);
  });
}

test("integrated A pagination: absent total terminates on raw short batch", async () => {
  const requests = [];
  const stories = await collectPilotPublishedPages(async ({ page: number }) => {
    requests.push(number);
    return { sourceKind: SOURCE_KIND, stories: number === 1 ? [fixture.legacyEn, fixture.legacyEs] : [] };
  }, { pageSize: 2 });
  assert.deepEqual(requests, [1, 2]);
  assert.equal(stories.length, 2);
});

test("integrated A cache: independent instances have independent cold starts", async () => {
  let loads = 0;
  const loadPublishedPage = async () => { loads++; return page([fixture.legacyEn, fixture.legacyEs]); };
  const first = createIntegratedSlugEsPilot({ loadPublishedPage });
  const second = createIntegratedSlugEsPilot({ loadPublishedPage });
  await first.getCatalog();
  await second.getCatalog();
  assert.equal(loads, 2);
});

test("integrated A cache: invalid clocks and configuration fail explicitly", async () => {
  assert.throws(() => createIntegratedSlugEsPilot({ loadPublishedPage: async () => page([]), ttlMs: -1 }), /INVALID_PILOT_CONFIGURATION/);
  const { pilot } = setup({ now: () => Number.NaN });
  await assert.rejects(pilot.getCatalog(), /INVALID_CLOCK/);
});

const schemaPatch = JSON.parse(readFileSync(new URL("../docs/pilot-a-post-schema.patch.json", import.meta.url), "utf8"));
const schemaProposal = JSON.parse(readFileSync(new URL("../docs/pilot-a-post-update.proposed.json", import.meta.url), "utf8"));

test("integrated A schema: review diff tests the exact seven-field original before additive operations", () => {
  assert.equal(schemaPatch[0].op, "test");
  assert.equal(schemaPatch[0].path, "/component/schema");
  assert.deepEqual(Object.keys(schemaPatch[0].value).sort(), ["title", "intro", "content", "image", "date", "category_ref", "language"].sort());
  assert.equal(schemaPatch.length, 4);
  assert.ok(schemaPatch.slice(1).every((operation) => operation.op === "add"));
});

test("integrated A schema: full replacement proposal preserves every original definition exactly", () => {
  const original = schemaPatch[0].value;
  const proposed = schemaProposal.component.schema;
  assert.deepEqual(Object.keys(schemaProposal), ["component"]);
  assert.deepEqual(Object.keys(schemaProposal.component), ["schema"]);
  assert.equal(Object.keys(proposed).length, 10);
  for (const [key, definition] of Object.entries(original)) assert.deepEqual(proposed[key], definition, key);
  const merged = clone(original);
  for (const operation of schemaPatch.slice(1)) merged[operation.path.slice("/component/schema/".length)] = clone(operation.value);
  assert.deepEqual(proposed, merged);
});

for (const [name, type, position] of [["slug_es", "text", 8], ["es_translation_approved", "boolean", 9], ["es_approved_hash", "text", 10]]) {
  test(`integrated A schema: ${name} is optional native ${type}, shared and additive`, () => {
    const value = schemaProposal.component.schema[name];
    assert.equal(value.type, type);
    assert.equal(value.pos, position);
    assert.equal(value.required, false);
    assert.equal(value.translatable, false);
    assert.equal(Object.hasOwn(value, "default_value"), false);
    assert.equal(Object.hasOwn(schemaPatch[0].value, name), false);
    assert.deepEqual(schemaPatch.find((operation) => operation.path === `/component/schema/${name}`).value, value);
  });
}

test("integrated A schema: slug and approval hash limits match application policy", () => {
  const { slug_es: slug, es_approved_hash: hash } = schemaProposal.component.schema;
  assert.equal(slug.max_length, 160);
  assert.equal(slug.regex, "^[a-z0-9]+(?:-[a-z0-9]+)*$");
  assert.equal(hash.max_length, 64);
  assert.equal(hash.regex, "^[a-f0-9]{64}$");
  assert.match("articulo-de-ensayo", new RegExp(slug.regex));
  assert.doesNotMatch("../escape", new RegExp(slug.regex));
  assert.match("a".repeat(64), new RegExp(hash.regex));
});

test("integrated A schema: replaying reviewed operations only changes an owned clone", () => {
  const before = clone(schemaPatch);
  const original = clone(schemaPatch[0].value);
  const proposed = clone(original);
  for (const operation of schemaPatch.slice(1)) proposed[operation.path.split("/").at(-1)] = clone(operation.value);
  assert.deepEqual(schemaPatch, before);
  assert.equal(Object.keys(original).length, 7);
  assert.equal(Object.keys(proposed).length, 10);
});

test("integrated A rehearsal: proposed draft uses isolated slugs without identities or approval from originals", () => {
  const payload = JSON.parse(readFileSync(new URL("../docs/pilot-a-trial-create.proposed.json", import.meta.url), "utf8"));
  const story = payload.story;
  assert.deepEqual(Object.keys(payload), ["story"]);
  for (const key of ["id", "uuid", "group_id", "alternates", "published", "publish_at", "first_published_at"]) assert.equal(Object.hasOwn(story, key), false, key);
  assert.equal(story.is_folder, false);
  assert.equal(story.is_startpage, false);
  assert.equal(story.slug, "i18n-pilot-black-box-20261113");
  assert.equal(story.content.slug_es, "i18n-piloto-caja-negra-20261113");
  assert.notEqual(story.slug, fixture.legacyEn.slug);
  assert.notEqual(story.content.slug_es, fixture.legacyEs.slug);
  assert.equal(story.content.component, "post");
  assert.equal(story.content.language, "english");
  assert.equal(story.content.es_translation_approved, false);
  assert.equal(story.content.es_approved_hash, "");
  assert.equal(Object.keys(story.content).some((key) => key.includes("__i18n__")), false, "real ES raw key spelling is deliberately not guessed");
});
