/* Server-only local batch simulation; all real editorial bodies stay outside Git. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node preloads this CommonJS fixture in an isolated copy.
const { readFileSync } = require("node:fs");

function loadPreparedBilingualBatchFixture(path) {
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  if (fixture.schema !== 1 || fixture.sourceKind !== "future-consolidation-simulation" ||
      fixture.managementWritePayload !== false || fixture.realPublicationObserved !== false ||
      !Array.isArray(fixture.baselineStories) || !Array.isArray(fixture.stories) ||
      !Array.isArray(fixture.spanishStories) || !Array.isArray(fixture.pairs) || fixture.pairs.length !== 15 ||
      new Set(fixture.pairs.map((pair) => pair.enUuid)).size !== 15) {
    throw new Error("INVALID_BILINGUAL_BATCH_SIMULATION");
  }
  return fixture;
}

function makeBatchMode(fixture, mode) {
  if (!["approved", "mixed"].includes(mode)) throw new Error("INVALID_BILINGUAL_BATCH_MODE");
  const result = structuredClone(fixture);
  if (mode === "mixed") {
    // Exercise transition compatibility without another build: half the pairs
    // still use both legacy identities. This never modifies the source file.
    for (const pair of result.pairs.filter((_, index) => index % 2 === 1)) {
      const en = result.stories.find((story) => story.uuid === pair.enUuid);
      const es = result.spanishStories.find((story) => story.uuid === pair.enUuid);
      if (!en || !es) throw new Error("MISSING_BILINGUAL_BATCH_IDENTITIES");
      for (const story of [en, es]) {
        story.content.es_translation_approved = false;
        story.content.es_approved_hash = "";
      }
    }
  }
  return result;
}

module.exports = { loadPreparedBilingualBatchFixture, makeBatchMode };

if (process.env.BILINGUAL_BATCH_FIXTURES === "1") {
  if (!process.env.BILINGUAL_BATCH_FIXTURE_DATA) throw new Error("MISSING_PRIVATE_BATCH_FIXTURE");
  const fixture = makeBatchMode(loadPreparedBilingualBatchFixture(process.env.BILINGUAL_BATCH_FIXTURE_DATA), process.env.BILINGUAL_BATCH_MODE || "approved");
  const stories = fixture.stories;
  const representations = new Map(fixture.spanishStories.map((story) => [story.uuid, story]));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = options?.method || (input instanceof Request ? input.method : "GET");
    if (method.toUpperCase() !== "GET") throw new Error("BATCH_SIMULATION_MUTATION_DISABLED");
    if (url.origin === process.env.BILINGUAL_BATCH_FONT_ORIGIN && url.hostname === "127.0.0.1" && url.pathname === "/owned-font.woff2") return realFetch(input, options);
    if (["localhost", "127.0.0.1"].includes(url.hostname) && url.origin === process.env.BILINGUAL_BATCH_LOCAL_ORIGIN) return realFetch(input, options);
    if (url.origin !== "https://api-us.storyblok.com" || !url.pathname.startsWith("/v2/cdn/")) throw new Error("BATCH_SIMULATION_EXTERNAL_NETWORK_DISABLED");
    const version = url.searchParams.get("version");
    const locale = url.searchParams.get("language") || "default";
    const byUuid = url.searchParams.get("find_by") === "uuid";
    if (process.env.BILINGUAL_BATCH_RUNTIME_IPC === "1") process.send?.({ type: "bilingual-batch-fetch", version, locale, byUuid, collection: url.pathname.endsWith("/stories") });
    if (version !== "published") return Response.json({ error: "Unavailable in published-only batch simulation" }, { status: 404 });
    const represent = (story) => structuredClone(locale === "es-co" && representations.has(story.uuid) ? representations.get(story.uuid) : story);
    if (url.pathname.endsWith("/links")) return Response.json({ links: Object.fromEntries(stories.map((story) => [story.uuid, { id: story.id, uuid: story.uuid, slug: story.full_slug, is_folder: false }])) });
    if (url.pathname.endsWith("/stories")) {
      const prefix = url.searchParams.get("starts_with") || "";
      const language = url.searchParams.get("filter_query[language][in]");
      const category = url.searchParams.get("filter_query[category_ref.cached_url][in]");
      const uuids = url.searchParams.get("by_uuids")?.split(",");
      const selected = stories.filter((story) => story.full_slug.startsWith(prefix) &&
        (!language || story.content.language === language) && (!category || story.content.category_ref?.cached_url === category) &&
        (!uuids || uuids.includes(story.uuid)));
      const page = Number(url.searchParams.get("page") || "1");
      const size = Number(url.searchParams.get("per_page") || "100");
      return Response.json({ stories: selected.slice((page - 1) * size, page * size).map(represent), total: selected.length, cv: 1, rels: [], links: [] });
    }
    const key = decodeURIComponent(url.pathname.split("/stories/")[1] || "");
    const found = stories.find((story) => byUuid ? story.uuid === key : story.full_slug === key);
    return found ? Response.json({ story: represent(found), cv: 1, rels: [], links: [] }) : Response.json({ error: "Not found" }, { status: 404 });
  };
}
