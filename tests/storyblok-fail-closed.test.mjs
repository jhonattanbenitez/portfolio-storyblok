import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const ts = require("typescript");

// Execute the actual server handlers with deterministic collaborators. No network,
// credentials, Next server, or permanent test routes are used by these tests.
function serverModule(relative, dependencies) {
  const filename = new URL(relative, import.meta.url);
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename.pathname }).outputText;
  const compiledModule = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  // A deterministic render-scope cache collaborator; actual Next runtime is
  // measured separately by the build probe. Never claim this stub proves Next.
  const cache = fn => { const memo = new Map(); return (...args) => { const key = JSON.stringify(args); if (!memo.has(key)) memo.set(key, fn(...args)); return memo.get(key); }; };
  const mocks = { "react": { cache }, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: Symbol("Fragment") }, "server-only": {}, ...dependencies };
  new Function("require", "module", "exports", output)(name => {
    assert.ok(Object.hasOwn(mocks, name), `Unmocked server dependency: ${name}`);
    return mocks[name];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
class DataError extends Error {
  constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}
const missing = Object.assign(new Error("TEST_NOT_FOUND"), { notFound: true });
const navigation = {
  notFound() { throw missing; }, permanentRedirect() { throw new Error("UNEXPECTED_REDIRECT"); },
  unstable_rethrow(error) { if (error?.frameworkControlFlow) throw error; },
};
const uuid = "11111111-2222-4333-8444-555555555555";
const story = { id: 1, uuid, full_slug: "posts/published", slug: "published", published_at: "2026-01-01T00:00:00Z",
  content: { component: "post", title: "Published title", language: "english" }, alternates: [] };
function catchallHarness(overrides = {}, draft = false) {
  const calls = { genericMetadata: 0 };
  const data = {
    getAllStoryParams: async () => [{ slug: [] }, { slug: ["posts", "published"] }, { slug: ["categories", "software"] }],
    getStoryFromRoute: async () => ({ story: structuredClone(story) }), getStoryBySlug: async () => ({ story }),
    getStoriesByUuids: async () => [], getPostContentLanguage: locale => locale === "es-co" ? "spanish" : "english",
    getStoryblokVersion: enabled => enabled ? "draft" : "published", isStoryblokNotFound: e => e?.status === 404,
    isStoryblokInvalidRequest: e => e?.code === "INVALID_REQUEST", resolveStoryRouteRedirect: async () => null,
    resolveCaseStudyStoriesForLocale: async ({ stories }) => stories,
    resolveLocalizedStoryUrls: async () => [{ locale: "en", href: "/posts/published" }], StoryblokDataError: DataError,
    ...overrides,
  };
  const metadata = {
    deterministicLocalizedUrls: () => [], generateMetadataFromStory(value) { if (!value) calls.genericMetadata++; return { title: value?.content.title || "Generic" }; },
    generateRedirectMetadata: () => ({}), generateStructuredData: () => ({}), serializeJsonLd: JSON.stringify,
  };
  const exports = serverModule("../src/app/[[...slug]]/page.tsx", {
    "@storyblok/react/rsc": { StoryblokStory() {}, StoryblokServerComponent() {} },
    "../../../lib/storyblok-data": data, "../../../utils/seo": metadata, "next/navigation": navigation,
    "../../../lib/draft-session": { getAuthorizedDraftMode: async () => ({ isEnabled: draft }) },
    "../../../lib/storyblok": { getStoryblokApi() {} }, "../../../contexts/AlternateLinksContext": { AlternateLinksPublisher() {} },
    "../../../components/HomeV2/HomeV2": { default() {} }, "../../../lib/home-v2": { isHomeV2Path: path => path === "/" || path === "/es-co" },
  });
  return { ...exports, calls };
}
const props = () => ({ params: Promise.resolve({ slug: ["posts", "published"] }), searchParams: Promise.resolve({}) });

for (const [name, error] of [["429", new DataError("Provider unavailable", "REQUEST_FAILED", 429)], ["503", new DataError("Provider unavailable", "REQUEST_FAILED", 503)],
  ["timeout", new DataError("Request timed out", "TIMEOUT")], ["invalid JSON", new DataError("Invalid response", "INVALID_RESPONSE")]]) {
  test(`metadata/render propagate ${name}; no generic metadata marks the failed route valid`, async () => {
    const page = catchallHarness({ getStoryFromRoute: async () => { throw error; } });
    await assert.rejects(page.generateMetadata(props()), candidate => candidate === error);
    await assert.rejects(page.default(props()), candidate => candidate === error);
    assert.equal(page.calls.genericMetadata, 0);
  });
}

test("actual missing route remains notFound and never becomes generic metadata", async () => {
  const page = catchallHarness({ getStoryFromRoute: async () => { throw new DataError("Missing", "REQUEST_FAILED", 404); } });
  await assert.rejects(page.generateMetadata(props()), candidate => candidate === missing);
  await assert.rejects(page.default(props()), candidate => candidate === missing);
  assert.equal(page.calls.genericMetadata, 0);
});

test("malformed successful provider payload cannot generate generic SEO", async () => {
  const page = catchallHarness({ getStoryFromRoute: async () => ({}) });
  await assert.rejects(page.generateMetadata(props()), error => error.code === "INVALID_RESPONSE");
  await assert.rejects(page.default(props()), error => error.code === "INVALID_RESPONSE");
  assert.equal(page.calls.genericMetadata, 0);
});

test("framework control-flow errors are rethrown rather than turned into provider success", async () => {
  const controlFlow = Object.assign(new Error("FRAMEWORK_CONTROL_FLOW"), { frameworkControlFlow: true });
  const page = catchallHarness({ getStoryFromRoute: async () => { throw controlFlow; } });
  await assert.rejects(page.generateMetadata(props()), candidate => candidate === controlFlow);
  await assert.rejects(page.default(props()), candidate => candidate === controlFlow);
});

test("static route enumeration propagates provider errors while preserving valid route coverage", async () => {
  const error = new DataError("Provider unavailable", "REQUEST_FAILED", 429);
  await assert.rejects(catchallHarness({ getAllStoryParams: async () => { throw error; } }).generateStaticParams(), candidate => candidate === error);
  assert.deepEqual(await catchallHarness().generateStaticParams(), [{ slug: [] }, { slug: ["posts", "published"] }]);
});

function homeHarness(failureSource, error) {
  const reject = async () => { throw error; };
  const data = {
    getPostsPage: failureSource === "posts" ? reject : async () => [],
    getStoriesByUuids: failureSource === "cases" ? reject : async () => [],
    getStories: failureSource === "categories" ? reject : async () => ({ stories: [] }),
    getStoryBySlug: async () => ({ story }), resolveCaseStudyStoriesForLocale: async ({ stories }) => stories,
  };
  return serverModule("../components/HomeV2/HomeV2.tsx", {
    "next/image": { default() {} }, "next/link": { default() {} }, "@storyblok/react/rsc": { storyblokEditable: () => ({}) },
    "../ContactForm": { default() {} }, "../../lib/storyblok-data": data,
    "../../lib/home-v2": { buildHomeV2Model() { throw new Error("FAILED_COLLECTION_WAS_RENDERED_AS_VALID_HOME"); }, HOME_V2_COPY: {}, homeEditorialDate() {} },
  }).default;
}
for (const source of ["posts", "cases", "categories"]) {
  test(`Home refuses to render a successful but incomplete page after ${source} CDA failure`, async () => {
    const error = new DataError("Provider unavailable", "REQUEST_FAILED", 429), home = homeHarness(source, error);
    const input = { story: { content: { body: [{ component: "case_studies_section", case_studies: [uuid] }] } }, locale: "en" };
    await assert.rejects(home(input), candidate => candidate === error);
  });
}

function catalogHarness({ collectionError, spanishError } = {}) {
  const registrations = [], stored = new Map(), errors = { collectionError, spanishError };
  let collectionCalls = 0;
  const data = {
    collectPublishedEditorialStories: async () => { collectionCalls++; if (errors.collectionError) throw errors.collectionError; return [{ ...story, content: { ...story.content, es_translation_approved: true } }]; },
    getStoryByUuid: async () => { if (errors.spanishError) throw errors.spanishError; return { story }; },
    getStoryblokToken(version) { assert.equal(version, "published"); return "synthetic-published-scope"; },
    isStoryblokNotFound: e => e?.status === 404,
  };
  const exports = serverModule("../lib/editorial-server.ts", {
    "node:crypto": { createHash },
    "next/cache": { unstable_cache(loader, keyParts, options) {
      registrations.push({ keyParts, options });
      return async () => {
        const key = JSON.stringify(keyParts);
        if (stored.has(key)) return structuredClone(stored.get(key));
        const value = await loader(); stored.set(key, structuredClone(value)); return value;
      };
    } },
    "next/server": { connection: async () => {} }, "./storyblok-data": data,
    "./editorial-catalog": {
      isEditorialModelEnabled: () => true, buildEditorialCatalog: () => ({ entries: ["validated"], diagnostics: [] }),
      createEditorialCatalogLoader: loader => ({ get: loader }),
    },
  });
  return { ...exports, observations: { registrations, errors, get collectionCalls() { return collectionCalls; },
    invalidateTag(tag) { if (registrations.some(row => row.options.tags.includes(tag))) stored.clear(); } } };
}
for (const type of ["collection", "spanish"]) {
  test(`published/static catalog propagates ${type} transport failure instead of downgrading silently`, async () => {
    const error = new DataError("Provider unavailable", "REQUEST_FAILED", 429);
    const catalog = catalogHarness(type === "collection" ? { collectionError: error } : { spanishError: error });
    await assert.rejects(catalog.getEditorialStaticCatalog(), candidate => candidate === error);
    await assert.rejects(catalog.getPublishedEditorialCatalog(), candidate => candidate === error);
  });
}

test("a genuinely missing published Spanish representation still allows catalog identity validation/fallback", async () => {
  const catalog = catalogHarness({ spanishError: new DataError("Missing translation", "REQUEST_FAILED", 404) });
  assert.deepEqual(await catalog.getEditorialStaticCatalog(), { entries: ["validated"], diagnostics: [] });
});

test("published metadata/render request one canonical relation variant inside a render scope", async () => {
  const observed = [];
  const page = catchallHarness({ getStoryFromRoute: async (...args) => { observed.push(args); return { story: structuredClone(story) }; } });
  await Promise.all([page.generateMetadata(props()), page.default(props())]);
  assert.deepEqual(observed, [["published", ["posts", "published"], "case_studies_section.case_studies"]]);
  assert.equal(page.calls.genericMetadata, 0);
});

test("authorized draft metadata/render bypass the published render cache", async () => {
  const observed = [];
  const page = catchallHarness({ getStoryFromRoute: async (...args) => { observed.push(args); return { story: structuredClone(story) }; } }, true);
  await Promise.all([page.generateMetadata(props()), page.default(props())]);
  assert.equal(observed.length, 2);
  assert.ok(observed.every(args => args[0] === "draft"));
});

test("published catalog binds Next cache to3600s CMS tags and credential digest rather than a raw token", async () => {
  const catalog = catalogHarness();
  await catalog.getEditorialStaticCatalog();
  const { keyParts, options } = catalog.observations.registrations[0];
  assert.equal(keyParts[0], "published-editorial-catalog-v1");
  assert.equal(keyParts[1], createHash("sha256").update("synthetic-published-scope").digest("hex"));
  assert.ok(!JSON.stringify(keyParts).includes("synthetic-published-scope"));
  assert.equal(options.revalidate, 3600);
  assert.deepEqual(options.tags, ["cms", "cms:stories", "cms:en", "cms:es-co"]);
});

test("catalog uses the Next cache adapter after fills and refills after cms invalidation", async () => {
  const catalog = catalogHarness();
  await catalog.getEditorialStaticCatalog(); await catalog.getEditorialStaticCatalog();
  assert.equal(catalog.observations.collectionCalls, 1);
  catalog.observations.invalidateTag("cms");
  await catalog.getEditorialStaticCatalog();
  assert.equal(catalog.observations.collectionCalls, 2);
});

test("catalog failure is rethrown and a later uncached recovery returns validated data", async () => {
  const error = new DataError("Provider unavailable", "REQUEST_FAILED", 429), catalog = catalogHarness({ collectionError: error });
  await assert.rejects(catalog.getEditorialStaticCatalog(), candidate => candidate === error);
  catalog.observations.errors.collectionError = undefined;
  assert.deepEqual(await catalog.getEditorialStaticCatalog(), { entries: ["validated"], diagnostics: [] });
  assert.equal(catalog.observations.collectionCalls, 2);
});

function sitemapHarness({ boundaryError, collectionError } = {}) {
  const calls = [];
  const sitemap = serverModule("../src/app/sitemap.ts", {
    "../../lib/storyblok-data": {
      getPublishedEditorialEntries: async () => { calls.push("editorial-boundary"); if (boundaryError) throw boundaryError; return []; },
      getAllStories: async () => { calls.push("all-stories"); if (collectionError) throw collectionError; return []; },
      getStoryBySlug: async () => { calls.push("case-home"); return { story: { content: { body: [] } } }; },
      getStoriesByUuids: async () => { calls.push("case-relations"); return []; }, resolveLocalizedStoryUrls: async () => [],
    },
    "../../utils/seo": { deterministicLocalizedUrls: () => [], buildSitemapEntries() { calls.push("rendered-sitemap"); return []; } },
  }).default;
  return { sitemap, calls };
}

test("sitemap resolves the editorial boundary before starting other CDA work or prerender bailout", async () => {
  for (const error of [Object.assign(new Error("FRAMEWORK_PRERENDER_BAILOUT"), { frameworkControlFlow: true }), new DataError("Unavailable", "REQUEST_FAILED", 429)]) {
    const { sitemap, calls } = sitemapHarness({ boundaryError: error });
    await assert.rejects(sitemap(), candidate => candidate === error);
    assert.deepEqual(calls, ["editorial-boundary"], "No all-stories/case request may be abandoned by a failed boundary");
  }
});

test("sitemap propagates a collection failure after its boundary instead of publishing partial entries", async () => {
  const error = new DataError("Unavailable", "REQUEST_FAILED", 503), { sitemap, calls } = sitemapHarness({ collectionError: error });
  await assert.rejects(sitemap(), candidate => candidate === error);
  assert.deepEqual(calls, ["editorial-boundary", "all-stories", "case-home"]);
  assert.ok(!calls.includes("rendered-sitemap"));
});
