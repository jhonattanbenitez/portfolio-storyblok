/* Test-process-only upstream. This module is never imported by application code. */
if (process.env.SECURITY_INTEGRATION_FIXTURES !== "1") {
  throw new Error("Integration fixture preload requires an explicit test process");
}

const realFetch = globalThis.fetch;
const makePost = (spanish = false) => ({
  id: spanish ? 900002 : 900001,
  uuid: spanish ? "security-fixture-es" : "security-fixture-en",
  name: "Synthetic security fixture",
  slug: spanish ? "security-fixture-es" : "security-fixture",
  full_slug: `posts/${spanish ? "security-fixture-es" : "security-fixture"}`,
  group_id: "synthetic-security-group",
  alternates: [],
  first_published_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  content: {
    _uid: "synthetic-post", component: "post", language: spanish ? "spanish" : "english",
    title: spanish ? "Artículo sintético" : "Synthetic security article",
    date: "2026-01-01", image: [{ filename: "https://a-us.storyblok.com/f/1023389/800x450/synthetic/fixture.png", alt: "Synthetic editorial asset" }],
    ...(spanish ? {
      title: "Base record before field localization",
      title__i18n__es_co: "Artículo sintético localizado",
      intro__i18n__es_co: "Introducción **localizada**.",
      content__i18n__es_co: "## Texto localizado\n\nContenido español de prueba.",
    } : {}),
    category_ref: { cached_url: `categories/${spanish ? "aprendizaje" : "learning"}` },
    intro: 'Safe intro </script><script>window.__securityProbe=true</script>',
    content: '# Safe heading\n\n<aside class="note"><strong>Safe editorial note</strong></aside>\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nconst answer = 42;\n```\n\n[Valid link](/posts)\n\n<img src="x" onerror="window.__securityProbe=true"><script>window.__securityProbe=true</script><a href="javascript:alert(1)">Unsafe link</a>\n\nFootnote[^1].\n\n[^1]: Safe note.',
  },
});
const english = makePost();
const spanish = makePost(true);
const makeCategory = (spanish = false) => ({
  id: spanish ? 900102 : 900101, uuid: spanish ? "category-es" : "category-en",
  name: spanish ? "Categoría española" : "English category",
  slug: spanish ? "aprendizaje" : "learning",
  full_slug: `categories/${spanish ? "aprendizaje" : "learning"}`,
  group_id: "synthetic-category-group", alternates: [], updated_at: "2026-01-02T00:00:00Z",
  content: { component: "Category", language: spanish ? "spanish" : "english", name: spanish ? "Categoría española" : "English category" },
});
const englishCategory = makeCategory();
const spanishCategory = makeCategory(true);
for (const [story, alternate] of [[english, spanish], [spanish, english], [englishCategory, spanishCategory], [spanishCategory, englishCategory]]) {
  story.alternates = [{ id: alternate.id, name: alternate.name, full_slug: alternate.full_slug, published: true }];
}

function representedStory(story, language) {
  const represented = structuredClone(story);
  if (language === "es-co") {
    for (const [key, value] of Object.entries(represented.content)) {
      if (key.endsWith("__i18n__es_co")) represented.content[key.slice(0, -"__i18n__es_co".length)] = value;
    }
  }
  return represented;
}

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname !== "api-us.storyblok.com") return realFetch(input, init);
  const version = url.searchParams.get("version");
  process.send?.({ type: "fixture-fetch", version });
  if (url.pathname.endsWith("/links")) {
    return Response.json({ links: { "900001": { id: english.id, slug: english.full_slug, is_folder: false } } });
  }
  if (url.pathname.endsWith("/stories")) {
    const prefix = url.searchParams.get("starts_with") || "";
    const language = url.searchParams.get("filter_query[language][in]");
    const category = url.searchParams.get("filter_query[category_ref.cached_url][in]");
    const stories = [english, spanish, englishCategory, spanishCategory].filter((story) =>
      story.full_slug.startsWith(prefix) && (!language || story.content.language === language) &&
      (!category || story.content.category_ref?.cached_url === category)
    );
    return Response.json({ stories: Number(url.searchParams.get("page") || "1") === 1 ? stories.map((story) => representedStory(story, url.searchParams.get("language"))) : [] });
  }
  const slug = decodeURIComponent(url.pathname.split("/stories/")[1] || "");
  let story;
  if (slug === english.full_slug || slug === spanish.full_slug || slug === "public-security-fixture") {
    story = representedStory(slug === spanish.full_slug ? spanish : english, url.searchParams.get("language"));
    if (slug === "public-security-fixture") { story.full_slug = slug; story.alternates = []; }
    if (version === "draft") story.content.title = "Authorized synthetic draft";
  } else if (slug === englishCategory.full_slug || slug === spanishCategory.full_slug) {
    story = structuredClone(slug === spanishCategory.full_slug ? spanishCategory : englishCategory);
  } else if (["home", "case-studies/home", "landing"].includes(slug)) {
    story = { ...english, full_slug: slug, content: { _uid: "synthetic-page", component: "page", body: [] } };
  }
  return story ? Response.json({ story }) : Response.json({ error: "Not found" }, { status: 404 });
};
