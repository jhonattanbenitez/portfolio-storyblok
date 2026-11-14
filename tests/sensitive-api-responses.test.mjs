import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as security from "../lib/request-security.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");
const environment = { NODE_ENV: "production", STORYBLOK_DRAFT_SECRET: "synthetic-draft-secret", STORYBLOK_PREVIEW_TOKEN: "synthetic-preview-token", STORYBLOK_REVALIDATION_SECRET: "synthetic-revalidate-secret" };

// Run the real handler body in memory; only Next request context/cache are stubbed.
function handler(kind, { fail = false, env = environment } = {}) {
  const source = readFileSync(new URL(`../src/app/api/${kind}/route.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const effects = [];
  const dependency = (name) => {
    if (name === "next/server") return { NextRequest, NextResponse };
    if (name === "next/headers") return { draftMode: async () => ({ enable() { if (fail) throw new Error("Synthetic draft context failure"); effects.push("draft-enabled"); } }) };
    if (name === "next/cache") return { revalidateTag(tag) { if (fail) throw new Error("Synthetic cache failure"); effects.push(tag); } };
    if (name.endsWith("/utils/cache")) return {
      revalidateAll: async () => { if (fail) throw new Error("Synthetic cache failure"); effects.push("all"); },
      revalidateStory: async (slug) => { if (fail) throw new Error("Synthetic cache failure"); effects.push(slug); },
    };
    if (name.endsWith("/lib/request-security")) return {
      ...security,
      isDraftRequestAuthorized: (value) => security.isDraftRequestAuthorized(value, env),
      isRevalidationRequestAuthorized: (value) => security.isRevalidationRequestAuthorized(value, env),
      createPreviewSession: () => security.createPreviewSession(env),
    };
    throw new Error(`Unstubbed handler dependency ${name}`);
  };
  const testModule = { exports: {} };
  runInNewContext(`(function(require,module,exports){${compiled}\n})`, { URL, URLSearchParams, Request, Response, Headers, process: { env }, console: { error() {} } })(dependency, testModule, testModule.exports);
  return { GET: testModule.exports.GET, effects };
}

function privateResponse(response) {
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.doesNotMatch(response.headers.get("cache-control"), /(?:^|,)\s*public\b|s-maxage/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
}

for (const kind of ["draft", "revalidate"]) {
  const secret = environment[kind === "draft" ? "STORYBLOK_DRAFT_SECRET" : "STORYBLOK_REVALIDATION_SECRET"];
  const path = kind === "draft" ? "slug=/live-preview/posts/fixture" : "tag=cms";
  test(`${kind} API: bearer authorization succeeds with private, nonindexable headers`, async () => {
    const { GET, effects } = handler(kind);
    const response = await GET(new NextRequest(`https://fixture.invalid/api/${kind}?${path}`, { headers: { Authorization: `Bearer ${secret}` } }));
    assert.equal(response.status, kind === "draft" ? 307 : 200);
    privateResponse(response);
    assert.equal(effects.length, 1);
    assert.equal((response.headers.get("location") || "").includes(secret), false);
  });
  test(`${kind} API: query compatibility is retained only in the absence of Authorization`, async () => {
    const { GET } = handler(kind);
    const response = await GET(new NextRequest(`https://fixture.invalid/api/${kind}?${path}&secret=${secret}`));
    assert.equal(response.status, kind === "draft" ? 307 : 200);
    privateResponse(response);
    for (const authorization of ["Bearer invalid", "Basic invalid", "Bearer "]) {
      const failed = await GET(new NextRequest(`https://fixture.invalid/api/${kind}?${path}&secret=${secret}`, { headers: { Authorization: authorization } }));
      assert.equal(failed.status, 401);
      privateResponse(failed);
      assert.equal(failed.headers.has("set-cookie"), false);
    }
  });
  test(`${kind} API: missing/duplicate/wrong authorization and absent configuration fail closed`, async () => {
    for (const suffix of ["", "&secret=invalid", `&secret=${secret}&secret=${secret}`]) {
      const { GET, effects } = handler(kind);
      const response = await GET(new NextRequest(`https://fixture.invalid/api/${kind}?${path}${suffix}`));
      assert.equal(response.status, 401);
      privateResponse(response);
      assert.equal(response.headers.has("set-cookie"), false);
      assert.equal(effects.length, 0);
    }
    const { GET, effects } = handler(kind, { env: { ...environment, [kind === "draft" ? "STORYBLOK_DRAFT_SECRET" : "STORYBLOK_REVALIDATION_SECRET"]: "" } });
    const response = await GET(new NextRequest(`https://fixture.invalid/api/${kind}?${path}`, { headers: { Authorization: `Bearer ${secret}` } }));
    assert.equal(response.status, 401);
    privateResponse(response);
    assert.equal(effects.length, 0);
  });
  test(`${kind} API: internal errors keep private headers and hide failure details`, async () => {
    const { GET } = handler(kind, { fail: true });
    const response = await GET(new NextRequest(`https://fixture.invalid/api/${kind}?${path}`, { headers: { Authorization: `Bearer ${secret}` } }));
    assert.equal(response.status, 500);
    privateResponse(response);
    const body = await response.text();
    assert.doesNotMatch(body, /Synthetic|Error:|stack|node_modules/);
  });
}

test("draft API: invalid destinations and missing preview delivery credentials remain private", async () => {
  for (const [slug, env, status] of [["//external.invalid", environment, 400], ["/live-preview/posts/fixture", { ...environment, STORYBLOK_PREVIEW_TOKEN: "" }, 503]]) {
    const { GET, effects } = handler("draft", { env });
    const response = await GET(new NextRequest(`https://fixture.invalid/api/draft?${new URLSearchParams({ slug })}`, { headers: { Authorization: `Bearer ${environment.STORYBLOK_DRAFT_SECRET}` } }));
    assert.equal(response.status, status);
    privateResponse(response);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal(effects.length, 0);
  }
});

test("request secret parsing gives Authorization exclusive precedence and rejects ambiguous queries", () => {
  const request = (suffix, authorization) => new Request(`https://fixture.invalid/api/draft${suffix}`, authorization === undefined ? {} : { headers: { Authorization: authorization } });
  assert.equal(security.getRequestSecret(request("?secret=query", "Bearer synthetic-header")), "synthetic-header");
  for (const authorization of ["Bearer invalid extra", "Basic synthetic-header", "", "Bearer "]) {
    assert.equal(security.getRequestSecret(request("?secret=query", authorization)), null);
  }
  assert.equal(security.getRequestSecret(request("?secret=query")), "query");
  assert.equal(security.getRequestSecret(request("?secret=query&secret=query")), null);
  assert.equal(security.getRequestSecret(request("")), null);
});

test("revalidation scope branches retain private success and error responses", async () => {
  for (const query of ["slug=all", "slug=posts%2Ffixture", "tag=cms", ""]) {
    for (const fail of [false, true]) {
      const { GET } = handler("revalidate", { fail });
      const response = await GET(new NextRequest(`https://fixture.invalid/api/revalidate?${query}`, { headers: { Authorization: `Bearer ${environment.STORYBLOK_REVALIDATION_SECRET}` } }));
      assert.equal(response.status, fail ? 500 : 200);
      privateResponse(response);
    }
  }
});

test("specific authorized tag invalidates both its source and the derived published catalog", async () => {
  const { GET, effects } = handler("revalidate");
  const response = await GET(new NextRequest("https://fixture.invalid/api/revalidate?tag=story%3Apublished-fixture", {
    headers: { Authorization: `Bearer ${environment.STORYBLOK_REVALIDATION_SECRET}` },
  }));
  assert.equal(response.status, 200); privateResponse(response);
  assert.deepEqual(effects, ["story:published-fixture", "cms"]);
});

test("authorized cms invalidation does not duplicate the same tag", async () => {
  const { GET, effects } = handler("revalidate");
  const response = await GET(new NextRequest("https://fixture.invalid/api/revalidate?tag=cms", {
    headers: { Authorization: `Bearer ${environment.STORYBLOK_REVALIDATION_SECRET}` },
  }));
  assert.equal(response.status, 200); privateResponse(response);
  assert.deepEqual(effects, ["cms"]);
});

test("unauthorized per-story tag invalidation has no source or catalog side effects", async () => {
  const { GET, effects } = handler("revalidate");
  const response = await GET(new NextRequest("https://fixture.invalid/api/revalidate?tag=story%3Apublished-fixture", {
    headers: { Authorization: "Bearer invalid" },
  }));
  assert.equal(response.status, 401); privateResponse(response);
  assert.deepEqual(effects, []);
});
