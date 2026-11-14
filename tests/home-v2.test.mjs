import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_V2_COPY,
  buildHomeV2Model,
  homeEditorialDate,
  homeExternalHref,
  homeWritingHref,
  homeWritingItems,
  homeWritingCategory,
  homeReadingMinutes,
  homeCaseFacts,
  isHomeV2Path,
} from "../lib/home-v2.ts";

const clone = value => structuredClone(value);
const post = (id, overrides = {}) => ({
  id, uuid: `published-${id}`, group_id: `article-${id}`,
  slug: `article-${id}`, full_slug: `posts/article-${id}`,
  published_at: "2026-01-01T00:00:00Z",
  content: { component: "post", language: "english", title: `Article ${id}`, date: "2026-01-01 12:00", intro: "Published intro", content: "Published body" },
  ...overrides,
});
const spanishPost = id => post(id, {
  full_slug: `posts/articulo-${id}`,
  content: { component: "post", language: "spanish", title: `Artículo ${id}`, date: "2026-01-01 12:00", intro: "Introducción", content: "Contenido" },
});
const project = (id, title, description = "Existing project description") => ({
  component: "project", _uid: `project-${id}`, title, description,
  image: [{ filename: `https://a-us.storyblok.com/f/1/${id}.png`, alt: `Published screenshot ${id}` }],
  gitUrl: { url: `https://github.com/example/project-${id}` },
  previewUrl: { url: `https://project-${id}.example.invalid/` },
});
const publicCase = (id, overrides = {}) => ({
  id, uuid: `public-case-${id}`, name: "Existing published case",
  full_slug: `case-studies/published-case-${id}`, published_at: "2025-01-01T00:00:00Z",
  content: { component: "case_study", title: "Published case", intro: "A published platform description", content: "React and PostgreSQL documented implementation", image: { filename: "https://a-us.storyblok.com/f/1/case.png" } },
  ...overrides,
});
const body = () => [
  { component: "hero", _uid: "hero", profile: [{ filename: "https://a-us.storyblok.com/f/1/portrait.jpeg", alt: "Real CMS portrait" }] },
  { component: "projects", _uid: "projects", project: [
    project(1, "Wasabi", "Published React and Storyblok website"),
    project(2, "Woodford Reserve", "Published accessibility work"),
    project(3, "Expense Tracker"), project(4, "Existing project four"),
    project(5, "Existing project five"), project(6, "Existing project six"),
  ] },
  { component: "about", _uid: "about", about_me: "Existing factual biography",
    skills: [{ id: "skills", content: [{ item: "Existing skill" }] }],
    education: [
      { id: "education", content: [{ item: "Existing education" }] },
      { id: "certifications", content: [{ item: "Existing certification" }] },
    ] },
  { component: "contact", _uid: "contact", title: "Existing contact title" },
];

test("Home V2 only owns the two published home paths", () => {
  assert.equal(isHomeV2Path("/"), true);
  assert.equal(isHomeV2Path("/es-co"), true);
  for (const path of ["/posts", "/es-co/posts", "/posts/article", "/case-studies/home", "/es-co/case-studies/home", "/contact", "/landing", "/live-preview", "/es-co/", "/home"]) {
    assert.equal(isHomeV2Path(path), false, path);
  }
});

test("Project links preserve ordinary real HTTP(S) URLs and trim editorial whitespace", () => {
  assert.equal(homeExternalHref(" https://github.com/example/repo "), "https://github.com/example/repo");
  assert.equal(homeExternalHref("http://example.invalid/path"), "http://example.invalid/path");
});

test("CMS links cannot introduce executable protocols, credentials or controls", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,attack", "file:///etc/passwd", "//example.invalid", "/relative", "https://owner:password@example.invalid/", "https://exam\nple.invalid/", "https://example.invalid/\u0000evil", undefined, {}, ""]) {
    assert.equal(homeExternalHref(url), null, String(url));
  }
});

test("Legacy writing URLs keep their original localized slugs", () => {
  assert.equal(homeWritingHref(post(1), "en"), "/posts/article-1");
  assert.equal(homeWritingHref(spanishPost(1), "es-co"), "/es-co/posts/articulo-1");
  assert.equal(homeWritingHref(spanishPost(1), "en"), null);
  assert.equal(homeWritingHref(post(1), "es-co"), null);
});

test("CDA locale prefixes are normalized only into known post paths", () => {
  const spanish = spanishPost(1);
  assert.equal(homeWritingHref({ ...spanish, full_slug: "es-co/posts/articulo-1" }, "es-co"), "/es-co/posts/articulo-1");
  for (const full_slug of ["fr/posts/articulo-1", "posts/../other", "posts/article-1?token=value", "posts/article-1#fragment", "posts/article%2Fother", "categories/article-1"]) {
    assert.equal(homeWritingHref({ ...spanish, full_slug }, "es-co"), null);
  }
});

test("Field-level writing uses its validated editorial href rather than its native English slug", () => {
  const story = post(1, { editorial: { locale: "es-co", model: "field", href: "/es-co/posts/titulo-localizado", localizedUrls: [] } });
  assert.equal(homeWritingHref(story, "es-co"), "/es-co/posts/titulo-localizado");
  assert.equal(homeWritingHref(story, "en"), null);
});

test("Malformed or foreign editorial hrefs never become Home links", () => {
  for (const href of ["https://example.invalid/", "//example.invalid/posts/a", "/posts/not-spanish", "/es-co/posts/article?secret=value", "/es-co/posts/../other", "/es-co/posts/"]) {
    assert.equal(homeWritingHref(post(1, { editorial: { locale: "es-co", model: "field", href, localizedUrls: [] } }), "es-co"), null);
  }
});

test("Published CDA stories do not require a synthetic published boolean", () => {
  assert.equal(homeWritingItems([post(1)], "en").length, 1);
  assert.equal(Object.hasOwn(post(1), "published"), false);
});

test("Latest Writing excludes explicitly unpublished, undated and non-post stories", () => {
  const data = [post(1, { published: false }), post(2, { published_at: null }), post(3, { content: { component: "case_study", title: "Wrong component" } }), post(4)];
  assert.deepEqual(homeWritingItems(data, "en").map(row => row.id), ["published-4"]);
});

test("Latest Writing keeps source order, deduplicates article identities, and caps at three", () => {
  const duplicate = post(7, { group_id: "article-1", full_slug: "posts/a-second-record" });
  const result = homeWritingItems([post(1), duplicate, post(2), post(3), post(4)], "en");
  assert.deepEqual(result.map(row => row.id), ["published-1", "published-2", "published-3"]);
  assert.equal(new Set(result.map(row => row.href)).size, 3);
});

test("Latest Writing rejects wrong-locale fallback and empty titles", () => {
  const empty = spanishPost(4); empty.content.title = " ";
  assert.deepEqual(homeWritingItems([post(1), spanishPost(2), empty], "es-co").map(row => row.title), ["Artículo 2"]);
});

test("An empty published collection produces an honest empty list", () => {
  assert.deepEqual(homeWritingItems([], "en"), []);
  assert.deepEqual(homeWritingItems([], "es-co"), []);
});

test("All six existing projects remain reachable alongside one selected case", () => {
  const result = buildHomeV2Model({ body: body(), locale: "en", caseStudies: [publicCase(1)] });
  assert.equal(result.selectedWork.length, 3);
  assert.equal(result.moreWork.length, 4);
  assert.deepEqual(result.selectedWork.map(row => row.title), ["Published case", "Wasabi", "Woodford Reserve"]);
  const all = [...result.selectedWork, ...result.moreWork];
  assert.equal(new Set(all.map(row => row.id)).size, 7);
  assert.equal(all.filter(row => row.kind === "project").length, 6);
  for (let id = 1; id <= 6; id++) assert.ok(all.find(row => row.id === `project-${id}`));
});

test("Published Spanish case links retain the localized detail path", () => {
  const story = publicCase(1, { full_slug: "es-co/case-studies/caso-publicado" });
  const result = buildHomeV2Model({ body: body(), locale: "es-co", caseStudies: [story] });
  assert.equal(result.selectedWork[0].href, "/es-co/case-studies/caso-publicado");
});

test("Private or malformed case studies cannot appear in selected work", () => {
  const result = buildHomeV2Model({ body: body(), locale: "en", caseStudies: [
    publicCase(1, { published: false }), publicCase(2, { published_at: null }),
    publicCase(3, { full_slug: "case-studies/../../private" }),
  ] });
  assert.equal([...result.selectedWork, ...result.moreWork].filter(row => row.kind === "case-study").length, 0);
  assert.equal(result.selectedWork.length + result.moreWork.length, 6);
});

test("Project descriptions remain exact and technologies require content evidence", () => {
  const input = body();
  const result = buildHomeV2Model({ body: input, locale: "en" });
  const all = [...result.selectedWork, ...result.moreWork];
  assert.equal(all.find(row => row.title === "Wasabi").description, input[1].project[0].description);
  assert.deepEqual(all.find(row => row.title === "Wasabi").technologies, ["React", "Storyblok"]);
  assert.deepEqual(all.find(row => row.title === "Woodford Reserve").technologies, []);
  assert.equal(Object.hasOwn(all[0], "metrics"), false);
  assert.equal(Object.hasOwn(all[0], "role"), false);
});

test("Untrusted project and image URLs become unavailable, never executable links", () => {
  const input = body();
  input[1].project[0].previewUrl.url = "javascript:alert(1)";
  input[1].project[0].gitUrl.url = "https://user:password@example.invalid/";
  input[0].profile[0].filename = "data:image/svg+xml,attack";
  const result = buildHomeV2Model({ body: input, locale: "en" });
  const work = result.selectedWork.find(row => row.title === "Wasabi");
  assert.equal(work.href, null);
  assert.equal(work.sourceHref, null);
  assert.equal(result.portrait, null);
});

test("Existing skills, education and education-nested certifications remain separate", () => {
  const result = buildHomeV2Model({ body: body(), locale: "en" });
  assert.deepEqual(result.details, [
    { id: "skills", items: ["Existing skill"] },
    { id: "education", items: ["Existing education"] },
    { id: "certifications", items: ["Existing certification"] },
  ]);
  assert.equal(result.biography, "Existing factual biography");
  assert.equal(result.contact.title, "Existing contact title");
});

test("The adapter does not mutate the original CMS contracts or supplied stories", () => {
  const input = { body: body(), locale: "en", posts: [post(1)], caseStudies: [publicCase(1)] };
  const before = clone(input);
  buildHomeV2Model(input);
  assert.deepEqual(input, before);
});

test("Missing optional CMS sections do not invent biography, images or work", () => {
  const result = buildHomeV2Model({ body: [], locale: "en" });
  assert.equal(result.biography, ""); assert.equal(result.portrait, null);
  assert.deepEqual(result.selectedWork, []); assert.deepEqual(result.moreWork, []);
  assert.deepEqual(result.details.map(group => group.items), [[], [], []]);
});

test("Editorial dates are localized without timezone day shifts", () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Honolulu";
    const a = homeEditorialDate("2024-02-29 00:00", "en");
    process.env.TZ = "Pacific/Auckland";
    assert.equal(homeEditorialDate("2024-02-29 23:59", "en"), a);
    assert.ok(a.includes("29") && a.includes("2024"));
    const es = homeEditorialDate("2024-02-29 00:00", "es-co");
    assert.ok(es.includes("29") && es.includes("2024") && /feb/i.test(es));
  } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
});

test("Invalid calendar dates are not rendered as a different editorial date", () => {
  for (const value of ["invalid", "", "2025-02-31 00:00", "2025-13-01", "2025-00-01"]) assert.equal(homeEditorialDate(value, "en"), "", value);
});

test("The requested professional statement is exact and Spanish copy is complete", () => {
  assert.equal(HOME_V2_COPY.en.headline, "Building thoughtful software for real-world problems.");
  assert.equal(HOME_V2_COPY.en.description, "I turn complex requirements into intuitive, reliable digital experiences — from product interfaces to complete platforms.");
  assert.equal(HOME_V2_COPY.en.eyebrow, "Software Engineer · Frontend & Product Engineering");
  assert.equal(HOME_V2_COPY.en.workCta, "Explore my work");
  assert.equal(HOME_V2_COPY.en.writingCta, "Read my writing");
  for (const key of Object.keys(HOME_V2_COPY.en)) {
    assert.ok(Object.hasOwn(HOME_V2_COPY["es-co"], key), key);
    assert.notEqual(HOME_V2_COPY["es-co"][key], "");
  }
});

test("Reading time is an estimate from the complete visible article with a 200 word/minute convention", () => {
  assert.equal(homeReadingMinutes("word ".repeat(200), "en"), 1);
  assert.equal(homeReadingMinutes("word ".repeat(201), "en"), 2);
  assert.equal(homeReadingMinutes("palabra ".repeat(199), "es-co", "introducción", "título"), 2);
});

test("Reading estimates count visible Markdown labels and code, not link targets or markup", () => {
  const body = `${"word ".repeat(195)} [read this](https://example.invalid/${"url-part-".repeat(400)})\n\n\`\`\`ts\nconst value = true\n\`\`\``;
  assert.equal(homeReadingMinutes(body, "en"), 1);
  assert.equal(homeReadingMinutes(`${body}\n\nextra`, "en"), 2);
});

test("Reading estimates understand GFM tables and sanitized editorial HTML", () => {
  const prefix = "word ".repeat(196);
  assert.equal(homeReadingMinutes(`${prefix}\n\n| Header | Value |\n| --- | --- |\n| one | two |`, "en"), 1);
  assert.equal(homeReadingMinutes(`${prefix}<aside class="note">one two three four five</aside><script>${"attack ".repeat(400)}</script>`, "en"), 2);
});

test("An absent or non-readable article body cannot claim a reading duration", () => {
  for (const body of [undefined, null, {}, "", "  ", "![Image](https://example.invalid/image.png)", "<script>private()</script>"]) {
    assert.equal(homeReadingMinutes(body, "en", "Intro", "Title"), null);
  }
});

const category = (id, language, group = `category-${id}`) => ({
  id, uuid: `category-${id}`, group_id: group, name: "CMS category name", slug: `category-${id}`, full_slug: `categories/category-${id}`,
  published_at: "2026-01-01T00:00:00Z", alternates: [], content: { component: "Category", language, name: language === "spanish" ? "Arquitectura" : "Architecture" },
});
test("Writing displays the existing localized category by UUID and shared identity", () => {
  const en = category(1, "english", "paired-category"), es = category(2, "spanish", "paired-category");
  const article = post(1); article.content.category_ref = { id: en.uuid, cached_url: en.full_slug };
  assert.equal(homeWritingCategory(article, [en, es], "en"), "Architecture");
  assert.equal(homeWritingCategory(article, [en, es], "es-co"), "Arquitectura");
});

test("Category translations can resolve reciprocal alternates without a shared group", () => {
  const en = category(1, "english"), es = category(2, "spanish");
  en.alternates = [{ id: es.id }]; es.alternates = [{ id: en.id }];
  const article = post(1); article.content.category_ref = { id: en.uuid };
  assert.equal(homeWritingCategory(article, [en, es], "es-co"), "Arquitectura");
});

test("Missing, unpublished or wrong-language categories do not invent labels or expose fallback", () => {
  const en = category(1, "english"), es = category(2, "spanish", en.group_id);
  const article = post(1); article.content.category_ref = { id: en.uuid };
  assert.equal(homeWritingCategory(article, [en], "es-co"), null);
  assert.equal(homeWritingCategory(article, [en, { ...es, published: false }], "es-co"), null);
  assert.equal(homeWritingCategory(post(2), [en, es], "en"), null);
});

test("Case facts preserve literal published paragraphs under explicit source headings", () => {
  const markdown = "## Client Challenge (Identified Problem)\n\nManual notes could be lost.\n\n## Proposed Solution (Key Features Developed)\n\nA shared platform.\n\n## Results and Client Impact\n\nRecords now belong to the business.";
  assert.deepEqual(homeCaseFacts(markdown, "en"), [
    { label: "problem", text: "Manual notes could be lost." },
    { label: "solution", text: "A shared platform." },
    { label: "outcome", text: "Records now belong to the business." },
  ]);
  assert.deepEqual(homeCaseFacts("## Technologies\n\nReact and Next.js, faster and modern.", "en"), []);
  assert.deepEqual(homeCaseFacts(markdown.replace("Client Challenge", "The Client Challenge"), "en"), homeCaseFacts(markdown, "en"));
});

test("An explicitly published qualitative result takes precedence over numerical result lists", () => {
  const facts = homeCaseFacts("## Results and Client Impact\n\n- **Time:** 30 minutes saved.\n- **Data Retention:** Company records replace dependence on chat history.", "en");
  assert.deepEqual(facts, [{ label: "outcome", text: "Data Retention: Company records replace dependence on chat history." }]);
});

test("Spanish case facts retain original text and never add personal responsibilities", () => {
  const facts = homeCaseFacts("## El Desafío del Cliente (Problema Identificado)\n\nNotas manuales.\n\n## La Solución Propuesta (Funcionalidades Clave Desarrolladas)\n\nPlataforma compartida.\n\n## Resultados e Impacto para el Cliente\n\nDatos centralizados.", "es-co");
  assert.equal(facts.length, 3);
  assert.deepEqual(facts.map(fact => fact.text), ["Notas manuales.", "Plataforma compartida.", "Datos centralizados."]);
  assert.equal(facts.some(fact => fact.label === "contribution"), false);
});
