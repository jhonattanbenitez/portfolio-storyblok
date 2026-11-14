/* Server-only local simulation. No snapshots or editorial bodies live in Git. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node preloads this isolated CommonJS fixture.
const { readFileSync } = require("node:fs");

function loadPreparedBlackboxFixture(path) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  if (value.schema !== 1 || value.sourceKind !== "future-consolidation-simulation" ||
      value.managementWritePayload !== false || !Array.isArray(value.stories) ||
      !Array.isArray(value.baselineStories) || !value.pilot || !value.spanishRepresentation) {
    throw new Error("INVALID_BLACKBOX_SIMULATION_FIXTURE");
  }
  return value;
}

module.exports = { loadPreparedBlackboxFixture };

if (process.env.BLACKBOX_MIGRATION_FIXTURES === "1") {
  if (!process.env.BLACKBOX_MIGRATION_FIXTURE_DATA) throw new Error("MISSING_PRIVATE_FIXTURE_FILE");
  const fixture = loadPreparedBlackboxFixture(process.env.BLACKBOX_MIGRATION_FIXTURE_DATA);
  const mode = process.env.BLACKBOX_MIGRATION_MODE || "approved";
  if (!["approved", "unapproved", "collision"].includes(mode)) throw new Error("INVALID_BLACKBOX_SIMULATION_MODE");
  const stories = structuredClone(fixture.stories);
  const representation = structuredClone(fixture.spanishRepresentation);
  const english = stories.find((story) => story.uuid === fixture.pilot.enUuid);
  const legacySpanish = stories.find((story) => story.uuid === fixture.pilot.esLegacyUuid);
  if (!english || !legacySpanish) throw new Error("MISSING_PILOT_SIMULATION_IDENTITIES");
  if (mode === "unapproved") {
    english.content.es_translation_approved = false;
    english.content.es_approved_hash = "";
    representation.content.es_translation_approved = false;
    representation.content.es_approved_hash = "";
  }
  if (mode === "collision") {
    // Change only an isolated simulated relationship, never the source snapshot.
    legacySpanish.group_id = "00000000-0000-4000-8000-000000000000";
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = options?.method || (input instanceof Request ? input.method : "GET");
    if (method.toUpperCase() !== "GET") throw new Error("MUTATION_DISABLED_FOR_MIGRATION_SIMULATION");
    if (["localhost", "127.0.0.1"].includes(url.hostname) && url.origin === process.env.BLACKBOX_MIGRATION_LOCAL_ORIGIN) return realFetch(input, options);
    if (url.origin !== "https://api-us.storyblok.com") throw new Error("EXTERNAL_NETWORK_DISABLED_FOR_MIGRATION_SIMULATION");
    const version = url.searchParams.get("version");
    const locale = url.searchParams.get("language") || "default";
    const byUuid = url.searchParams.get("find_by") === "uuid";
    if (process.env.BLACKBOX_FIXTURE_RUNTIME_IPC === "1") {
      process.send?.({ type: "blackbox-fixture-fetch", version, locale, byUuid, collection: url.pathname.endsWith("/stories") });
    }
    // The old unpublished rehearsal is deliberately absent, even from draft
    // requests: this fixture grants no draft access and makes no live API calls.
    if (version !== "published") return Response.json({ error: "Unavailable in published-only simulation" }, { status: 404 });
    const represent = (story) => story.uuid === fixture.pilot.enUuid && locale === "es-co"
      ? structuredClone(representation) : structuredClone(story);
    if (url.pathname.endsWith("/links")) {
      return Response.json({ links: Object.fromEntries(stories.map((story) => [story.uuid, {
        id: story.id, uuid: story.uuid, slug: story.full_slug, is_folder: false,
      }])) });
    }
    if (url.pathname.endsWith("/stories")) {
      const prefix = url.searchParams.get("starts_with") || "";
      const language = url.searchParams.get("filter_query[language][in]");
      const category = url.searchParams.get("filter_query[category_ref.cached_url][in]");
      const uuids = url.searchParams.get("by_uuids")?.split(",");
      const selected = stories.filter((story) => story.full_slug.startsWith(prefix) &&
        (!language || story.content.language === language) &&
        (!category || story.content.category_ref?.cached_url === category) &&
        (!uuids || uuids.includes(story.uuid)));
      const page = Number(url.searchParams.get("page") || "1");
      const perPage = Number(url.searchParams.get("per_page") || "100");
      return Response.json({ stories: selected.slice((page - 1) * perPage, page * perPage).map(represent), total: selected.length, cv: 1, rels: [], links: [] });
    }
    const key = decodeURIComponent(url.pathname.split("/stories/")[1] || "");
    const found = stories.find((story) => byUuid ? story.uuid === key : story.full_slug === key);
    return found ? Response.json({ story: represent(found), cv: 1, rels: [], links: [] })
      : Response.json({ error: "Not found" }, { status: 404 });
  };
}
