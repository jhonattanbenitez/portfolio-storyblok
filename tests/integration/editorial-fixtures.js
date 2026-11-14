/* Owned synthetic CDA responses. This file is never imported by application code. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node --require preloads this CommonJS test fixture.
const { createHash } = require("node:crypto");

const ids = {
  en: "11111111-1111-4111-8111-111111111111",
  es: "22222222-2222-4222-8222-222222222222",
  categoryEn: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  categoryEs: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  draft: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};
const spanishText = {
  title: "Artículo editorial unificado",
  intro: "Introducción española revisada.",
  content: "## Español\n\nArtículo español revisado.",
};

function makeEditorialFixtures() {
  const published = "2026-01-02T00:00:00.000Z";
  const en = {
    id: 810001, uuid: ids.en, name: "Owned editorial fixture", slug: "editorial-fixture",
    full_slug: "posts/editorial-fixture", group_id: "33333333-3333-4333-8333-333333333333",
    published_at: published, first_published_at: published, updated_at: published,
    created_at: published, alternates: [], translated_slugs: [], lang: "default",
    content: {
      component: "post", _uid: "synthetic-editorial-post", language: "english",
      title: "Editorial fixture English", intro: "Reviewed English introduction.",
      content: "## English\n\nReviewed English article.", date: "2026-01-01", image: [],
      category_ref: { id: ids.categoryEn, cached_url: "categories/editorial-category", linktype: "story", fieldtype: "multilink", url: "" },
      slug_es: "editorial-fixture-es", es_translation_approved: true,
    },
  };
  // Independent fixture commitment to the documented review payload. No raw
  // __i18n__ keys or synthetic publication booleans are added to CDA responses.
  en.content.es_approved_hash = createHash("sha256").update(JSON.stringify({
    id: en.id, uuid: en.uuid, locale: "es-co", enSlug: en.slug,
    slug_es: en.content.slug_es,
    english: Object.fromEntries(["title", "intro", "content"].map((key) => [key, en.content[key]])),
    spanish: spanishText, categoryIdentity: ids.categoryEn,
  })).digest("hex");
  const es = structuredClone(en);
  Object.assign(es, { id: 810002, uuid: ids.es, name: "Owned legacy Spanish fixture", slug: "editorial-fixture-es", full_slug: "posts/editorial-fixture-es" });
  Object.assign(es.content, { language: "spanish", title: "Artículo legacy español", intro: "Introducción legacy española.", content: "## Legacy\n\nTexto español legacy.", category_ref: { ...es.content.category_ref, id: ids.categoryEs, cached_url: "categories/categoria-editorial" } });
  delete es.content.slug_es;
  delete es.content.es_translation_approved;
  delete es.content.es_approved_hash;
  en.alternates = [{ id: es.id, full_slug: es.full_slug, published: true }];
  es.alternates = [{ id: en.id, full_slug: en.full_slug, published: true }];
  const categoryEn = {
    id: 810101, uuid: ids.categoryEn, name: "Editorial category", slug: "editorial-category",
    full_slug: "categories/editorial-category", group_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    published_at: published, updated_at: published,
    content: { component: "Category", language: "english", name: "Editorial category" }, alternates: [],
  };
  const categoryEs = structuredClone(categoryEn);
  Object.assign(categoryEs, { id: 810102, uuid: ids.categoryEs, name: "Categoría editorial", slug: "categoria-editorial", full_slug: "categories/categoria-editorial" });
  Object.assign(categoryEs.content, { language: "spanish", name: "Categoría editorial" });
  categoryEn.alternates = [{ id: categoryEs.id, full_slug: categoryEs.full_slug, published: true }];
  categoryEs.alternates = [{ id: categoryEn.id, full_slug: categoryEn.full_slug, published: true }];
  const representationEs = structuredClone(en);
  Object.assign(representationEs.content, spanishText);
  representationEs.lang = "es-co";
  representationEs.full_slug = `es-co/${en.full_slug}`;
  const draft = structuredClone(en);
  Object.assign(draft, { id: 810003, uuid: ids.draft, slug: "editorial-private-draft", full_slug: "posts/editorial-private-draft", published_at: null, first_published_at: null, alternates: [] });
  Object.assign(draft.content, { title: "Unpublished private editorial fixture", slug_es: "borrador-editorial-privado", es_translation_approved: false, es_approved_hash: "" });
  return { en, es, categoryEn, categoryEs, representationEs, draft, spanishText: structuredClone(spanishText), ids: { ...ids } };
}

// CDA's language parameter uses the configured hyphenated code, while native
// MAPI field keys use __i18n__es_co. An unknown CDA code returns base English.
function representEditorialFixture(fixtures, story, locale) {
  return story.uuid === fixtures.ids.en && locale === "es-co"
    ? structuredClone(fixtures.representationEs) : structuredClone(story);
}

module.exports = { makeEditorialFixtures, representEditorialFixture };

if (process.env.EDITORIAL_INTEGRATION_FIXTURES === "1") {
  const fixtures = makeEditorialFixtures();
  const realFetch = globalThis.fetch;
  const publishedStories = [fixtures.en, fixtures.es, fixtures.categoryEn, fixtures.categoryEs];
  const represent = (story, locale) => representEditorialFixture(fixtures, story, locale);
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname !== "api-us.storyblok.com") {
      if (["localhost", "127.0.0.1"].includes(url.hostname)) return realFetch(input);
      throw new Error("External network disabled in owned editorial integration");
    }
    const version = url.searchParams.get("version");
    const locale = url.searchParams.get("language") || "default";
    // Build workers use their own IPC protocol; diagnostics are enabled only in
    // the explicitly spawned next-start process owned by this runner.
    if (process.env.EDITORIAL_FIXTURE_RUNTIME_IPC === "1") {
      process.send?.({ type: "editorial-fixture-fetch", version, locale, byUuid: url.searchParams.get("find_by") === "uuid", collection: url.pathname.endsWith("/stories") });
    }
    if (url.pathname.endsWith("/links")) {
      return Response.json({ links: Object.fromEntries(publishedStories.map((story) => [story.uuid, { id: story.id, uuid: story.uuid, slug: story.full_slug, is_folder: false }])) });
    }
    if (url.pathname.endsWith("/stories")) {
      const prefix = url.searchParams.get("starts_with") || "";
      const language = url.searchParams.get("filter_query[language][in]");
      const category = url.searchParams.get("filter_query[category_ref.cached_url][in]");
      const byUuids = url.searchParams.get("by_uuids")?.split(",");
      const filtered = publishedStories.filter((story) => story.full_slug.startsWith(prefix) &&
        (!language || story.content.language === language) && (!category || story.content.category_ref?.cached_url === category) &&
        (!byUuids || byUuids.includes(story.uuid)));
      const page = Number(url.searchParams.get("page") || "1");
      const perPage = Number(url.searchParams.get("per_page") || "100");
      return Response.json({ stories: filtered.slice((page - 1) * perPage, page * perPage).map((story) => represent(story, locale)), total: filtered.length, cv: 1, rels: [], links: [] });
    }
    const key = decodeURIComponent(url.pathname.split("/stories/")[1] || "");
    const all = version === "draft" ? [...publishedStories, fixtures.draft] : publishedStories;
    let story = all.find((candidate) => url.searchParams.get("find_by") === "uuid" ? candidate.uuid === key : candidate.full_slug === key);
    if (["home", "case-studies/home", "landing"].includes(key)) story = { ...fixtures.en, full_slug: key, content: { component: "page", _uid: "synthetic-page", body: [] } };
    return story ? Response.json({ story: represent(story, locale), cv: 1, rels: [], links: [] }) : Response.json({ error: "Not found" }, { status: 404 });
  };
}
