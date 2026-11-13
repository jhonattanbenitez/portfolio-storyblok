import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { getStoryFromRoute, getStoryBySlug, requestStoryblok, StoryblokDataError } from "../lib/storyblok-data.ts";

const require = createRequire(import.meta.url);
const { getRouteMatcher } = require("next/dist/shared/lib/router/utils/route-matcher.js");
const { getRouteRegex } = require("next/dist/shared/lib/router/utils/route-regex.js");
const matchRoute = getRouteMatcher(getRouteRegex("/[[...slug]]"));

async function withInterceptedDelivery(run) {
  const previousFetch = globalThis.fetch;
  const previousTokens = [process.env.STORYBLOK_TOKEN, process.env.STORYBLOK_PREVIEW_TOKEN];
  process.env.STORYBLOK_TOKEN = "synthetic-fixed-published";
  process.env.STORYBLOK_PREVIEW_TOKEN = "synthetic-fixed-preview";
  const requests = [];
  globalThis.fetch = async (input) => {
    requests.push(new URL(typeof input === "string" ? input : input.url ?? input.href));
    return Response.json({ story: { id: 1, content: { component: "post" } } });
  };
  try { await run(requests); } finally {
    globalThis.fetch = previousFetch;
    for (const [index, name] of ["STORYBLOK_TOKEN", "STORYBLOK_PREVIEW_TOKEN"].entries()) {
      if (previousTokens[index] === undefined) delete process.env[name];
      else process.env[name] = previousTokens[index];
    }
  }
}

function assertFixedDeliveryParameters(url, version = "published") {
  assert.equal(url.origin, "https://api-us.storyblok.com");
  assert.equal(url.hash, "");
  assert.deepEqual(url.searchParams.getAll("version"), [version]);
  assert.deepEqual(url.searchParams.getAll("token"), [version === "draft" ? "synthetic-fixed-preview" : "synthetic-fixed-published"]);
  assert.equal(url.searchParams.has("pad"), false);
}

test("APPSEC-01: the real Next matcher cannot inject CDN token/version through a decoded slug", async () => {
  await withInterceptedDelivery(async (requests) => {
    const value = "probe?token=synthetic-external-space&version=draft&pad=";
    const params = matchRoute(`/posts/${encodeURIComponent(value)}`);
    assert.deepEqual(params.slug, ["posts", value]);
    await getStoryFromRoute("published", params.slug);
    assert.equal(requests.length, 1);
    assertFixedDeliveryParameters(requests[0]);
    assert.equal(requests[0].pathname, `/v2/cdn/stories/posts/${encodeURIComponent(value)}`);
    assert.equal(requests[0].searchParams.get("language"), "en");
  });
});

test("CDN path segments preserve Unicode, spaces and delimiters as encoded data", async () => {
  await withInterceptedDelivery(async (requests) => {
    for (const value of ["café", "日本語", "emoji-🌍", "spaces in slug", "question?mark", "hash#value", "and&value=other", "probe%3Ftoken%3Dexternal%26version%3Ddraft", "probe%253Ftoken%253Dexternal"]) {
      const params = matchRoute(`/es-co/posts/${encodeURIComponent(value)}`);
      await getStoryFromRoute("published", params.slug, "post.category_ref");
      const url = requests.at(-1);
      assertFixedDeliveryParameters(url);
      assert.equal(url.pathname, `/v2/cdn/stories/posts/${encodeURIComponent(value)}`);
      assert.equal(url.searchParams.get("language"), "es-co");
      assert.equal(url.searchParams.get("resolve_relations"), "post.category_ref");
    }
  });
});

test("CDN credentials and version cannot be replaced by supplied query parameters", async () => {
  await withInterceptedDelivery(async (requests) => {
    await requestStoryblok("stories/posts/safe", { version: "published", params: {
      token: "synthetic-external-space", version: "draft", language: "es-co", page: 3,
      sort_by: "content.date:desc,id:desc", "filter_query[language][in]": "spanish",
    } });
    assert.equal(requests.length, 1);
    assertFixedDeliveryParameters(requests[0]);
    assert.equal(requests[0].searchParams.get("language"), "es-co");
    assert.equal(requests[0].searchParams.get("page"), "3");
    assert.equal(requests[0].searchParams.get("sort_by"), "content.date:desc,id:desc");
    assert.equal(requests[0].searchParams.get("filter_query[language][in]"), "spanish");
  });
});

const invalid = (error) => error instanceof StoryblokDataError && error.code === "INVALID_REQUEST" && error.status === 400;
test("malformed/traversing story segments fail before any network request", async () => {
  await withInterceptedDelivery(async (requests) => {
    for (const slug of ["posts/../probe", "posts/./probe", "posts//probe", "posts/back\\slash", "posts/control\u0000", "posts/control\r\n", "posts/%", "posts/%GG", "posts/%C3%28", "posts/%2e%2e/probe", "posts/%252e%252e/probe", "posts/%25252e%25252e/probe", "posts/probe%2Fother", "posts/probe%252Fother", "posts/probe%5Cother", "posts/probe%255Cother", "posts/\ud800"]) {
      await assert.rejects(getStoryBySlug({ slug, locale: "en", version: "published" }), invalid, `Accepted malformed slug ${JSON.stringify(slug)}`);
    }
    assert.equal(requests.length, 0);
  });
});

test("encoded separators from the real Next matcher are rejected before joining route segments", async () => {
  await withInterceptedDelivery(async (requests) => {
    for (const path of ["/posts/probe%2Fother", "/posts/probe%252Fother", "/posts/%2e%2e", "/posts/%252e%252e", "/posts/probe%5Cother", "/posts/probe%00"]) {
      const params = matchRoute(path);
      await assert.rejects(getStoryFromRoute("published", params.slug), invalid, path);
    }
    assert.equal(requests.length, 0);
    for (const path of ["/posts/%", "/posts/%GG", "/posts/%C3%28"]) assert.throws(() => matchRoute(path));
  });
});
