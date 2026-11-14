import assert from "node:assert/strict";
import test from "node:test";
import { resolveStoryRouteRedirect, resolveLocalizedStoryUrls, getPosts, getPostsPage, StoryblokDataError } from "../lib/storyblok-data.ts";
import { generateMetadataFromStory, generateStructuredData, generateRedirectMetadata, getSiteUrl } from "../utils/seo.ts";
import { markdownToPlainText } from "../utils/markdown.ts";

function pair(component = "post") {
  const root = component === "Category" ? "categories" : "posts";
  const en = { id: 1, uuid: "fixture-en", name: "English", slug: "english", full_slug: `${root}/english`, group_id: "fixture-group", alternates: [], content: { component, language: "english" } };
  const es = { id: 2, uuid: "fixture-es", name: "Spanish", slug: "espanol", full_slug: `${root}/espanol`, group_id: en.group_id, alternates: [], content: { component, language: "spanish", title: "Localized Spanish title", content: "Localized Spanish body" } };
  for (const [story, other] of [[en, es], [es, en]]) story.alternates = [{ id: other.id, full_slug: other.full_slug, published: true }];
  return { en, es };
}

for (const component of ["post", "Category"]) {
  test(`${component}: correct locale remains available without a lookup`, async () => {
    const { en, es } = pair(component);
    for (const [story, locale] of [[en, "en"], [es, "es-co"]]) {
      assert.equal(await resolveStoryRouteRedirect({ story, locale, version: "published", fetchAlternate: () => { throw new Error("Unnecessary lookup"); } }), null);
    }
  });
  test(`${component}: wrong locale redirects to the real translated slug and preserves query values`, async () => {
    const { en, es } = pair(component);
    const target = await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published", fetchAlternate: async () => es, searchParams: { ref: ["newsletter", "social"], q: "a & b", absent: undefined } });
    const parsed = new URL(target, "https://fixture.invalid");
    assert.equal(parsed.pathname, `/es-co/${es.full_slug}`);
    assert.deepEqual(parsed.searchParams.getAll("ref"), ["newsletter", "social"]);
    assert.equal(parsed.searchParams.get("q"), "a & b");
    assert.equal(parsed.searchParams.has("absent"), false);
    assert.equal(await resolveStoryRouteRedirect({ story: es, locale: "en", version: "published", fetchAlternate: async () => en }), `/${en.full_slug}`);
  });
  test(`${component}: a missing or invalid alternate redirects to the record's own valid URL`, async () => {
    for (const scenario of ["missing", "unpublished", "group", "non-mutual", "wrong-id", "wrong-language", "wrong-component", "not-found"]) {
      const { en, es } = pair(component);
      if (scenario === "missing") en.alternates = [];
      if (scenario === "unpublished") en.alternates[0].published = false;
      if (scenario === "group") es.group_id = "other";
      if (scenario === "non-mutual") es.alternates = [];
      if (scenario === "wrong-id") es.id = 999;
      if (scenario === "wrong-language") es.content.language = "english";
      if (scenario === "wrong-component") es.content.component = "page";
      const target = await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published", fetchAlternate: async () => { if (scenario === "not-found") throw new StoryblokDataError("Missing alternate", "REQUEST_FAILED", 404); return es; }, onWarning() {} });
      assert.equal(target, `/${en.full_slug}`, scenario);
    }
  });
}

for (const component of ["post", "Category"]) {
  test(`${component}: transient alternate failures propagate rather than choosing an incorrect fallback`, async () => {
    const { en } = pair(component);
    for (const error of [new StoryblokDataError("Rate limited", "REQUEST_FAILED", 429), new StoryblokDataError("Unavailable", "REQUEST_FAILED", 503), new Error("Network failure")]) {
      const options = { story: en, locale: "es-co", version: "published", fetchAlternate: async () => { throw error; }, onWarning() {} };
      await assert.rejects(resolveStoryRouteRedirect(options), candidate => candidate === error);
      await assert.rejects(resolveLocalizedStoryUrls({ ...options, currentLocale: "en" }), candidate => candidate === error);
    }
  });
}

test("category alternate destinations use each record's real slug", async () => {
  const { en, es } = pair("Category");
  assert.deepEqual(await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es }), [
    { locale: "en", href: "/categories/english" },
    { locale: "es-co", href: "/es-co/categories/espanol" },
  ]);
  es.content.language = "english";
  assert.equal((await resolveLocalizedStoryUrls({ story: en, currentLocale: "en", version: "published", fetchAlternate: async () => es, onWarning() {} })).length, 1);
});

test("shared field-localized CMS pages keep both public routes", async () => {
  const { en } = pair();
  en.content.component = "page";
  assert.equal(await resolveStoryRouteRedirect({ story: en, locale: "es-co", version: "published" }), null);
});

test("Markdown descriptions preserve readable text without markup or executable content", () => {
  const intro = '# A **clear** title\n\nA [useful link](https://example.com), `code`, &amp; text.\n\n<ul><li>First</li><li>Second</li></ul><script>bad()</script>';
  const plain = markdownToPlainText(intro);
  assert.equal(plain, "A clear title A useful link, code, & text. First Second");
  const story = { name: "Fixture", content: { component: "post", title: "Fixture", intro } };
  const meta = generateMetadataFromStory(story, "en", "/posts/fixture");
  assert.equal(meta.description, plain);
  assert.equal(meta.openGraph.description, plain);
  assert.equal(meta.twitter.description, plain);
  assert.equal(generateStructuredData(story, "en", "/posts/fixture").description, plain);
  assert.equal(markdownToPlainText(undefined), "");
  assert.equal(generateMetadataFromStory({ ...story, content: { intro: "<script>bad()</script>" } }).description, "Frontend Developer specializing in modern, accessible web experiences.");
});

test("redirected aliases advertise noindex and only the approved canonical target", () => {
  const metadata = generateRedirectMetadata("/es-co/posts/espanol");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.alternates.canonical, `${getSiteUrl()}/es-co/posts/espanol`);
  assert.equal(metadata.alternates.languages, undefined);
});

async function withUpstream(stories, run, failPage) {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.STORYBLOK_TOKEN;
  const queries = [];
  process.env.STORYBLOK_TOKEN = "synthetic-collection-token";
  globalThis.fetch = async (input) => {
    const query = new URL(input).searchParams;
    queries.push(query);
    const page = Number(query.get("page"));
    if (page === failPage) return new Response(null, { status: 400 });
    assert.equal(query.get("sort_by"), "content.date:desc,id:desc");
    assert.equal(query.get("content_type"), "post");
    const selected = stories.filter((story) => story.content.language === query.get("filter_query[language][in]") && (!query.get("filter_query[category_ref.cached_url][in]") || story.content.category_ref?.cached_url === query.get("filter_query[category_ref.cached_url][in]")))
      .sort((a, b) => b.content.date.localeCompare(a.content.date) || b.id - a.id);
    const size = Number(query.get("per_page"));
    return Response.json({ stories: selected.slice((page - 1) * size, page * size) });
  };
  try { await run(queries); } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.STORYBLOK_TOKEN;
    else process.env.STORYBLOK_TOKEN = previousToken;
  }
}
const collection = Array.from({ length: 205 }, (_, index) => ({ id: index + 1, content: { component: "post", language: index < 203 ? "english" : "spanish", date: index % 2 ? "2026-02-01" : "2026-01-01", ...(index < 100 ? { category_ref: { cached_url: "categories/learning" } } : {}) } }));

test("collections retain every post beyond 100, including uncategorized posts, with stable date/id ordering", async () => {
  await withUpstream(collection, async (queries) => {
    const posts = await getPosts({ version: "published", locale: "en" });
    assert.equal(posts.length, 203);
    assert.equal(new Set(posts.map((post) => post.id)).size, 203);
    assert.deepEqual(queries.map((query) => query.get("page")), ["1", "2", "3"]);
    assert.deepEqual(posts.slice(0, 3).map((post) => post.id), [202, 200, 198]);
    assert.equal(posts.at(-1).id, 1);
    assert.ok(posts.some((post) => !post.content.category_ref));
  });
});

test("page retrieval keeps category/language filters and returns the requested ordered slice", async () => {
  await withUpstream(collection, async (queries) => {
    const posts = await getPostsPage({ version: "published", locale: "en", categorySlug: "learning", page: 2, perPage: 12 });
    assert.deepEqual(posts.map((post) => post.id), [76, 74, 72, 70, 68, 66, 64, 62, 60, 58, 56, 54]);
    assert.equal(queries.length, 1);
    assert.equal(queries[0].get("language"), "en");
    assert.equal(queries[0].get("filter_query[category_ref.cached_url][in]"), "categories/learning");
  });
});

test("later-page failures are exposed instead of silently returning a partial collection", async () => {
  await withUpstream(collection, async () => {
    await assert.rejects(getPosts({ version: "published", locale: "en" }), (error) => error.status === 400);
  }, 2);
});

test("invalid page sizes/numbers are rejected before requesting Storyblok", async () => {
  for (const settings of [{ page: 0 }, { page: 1.5 }, { perPage: 0 }, { perPage: 101 }]) {
    await assert.rejects(getPostsPage({ version: "published", locale: "en", ...settings }), RangeError);
  }
});
