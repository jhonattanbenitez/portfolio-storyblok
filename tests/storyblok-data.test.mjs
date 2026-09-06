import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoryblokFetchOptions,
  getStoryblokToken,
  getStoryLinks,
  requestStoryblok,
  StoryblokDataError,
} from "../lib/storyblok-data.ts";

test("published and draft requests select their dedicated server token", () => {
  const env = {
    STORYBLOK_TOKEN: "published-server",
    STORYBLOK_PREVIEW_TOKEN: "draft-server",
    NEXT_PUBLIC_STORYBLOK_TOKEN: "published-public",
    NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN: "draft-public",
  };
  assert.equal(getStoryblokToken("published", env), "published-server");
  assert.equal(getStoryblokToken("draft", env), "draft-server");
});

test("public tokens remain a temporary compatibility fallback", () => {
  assert.equal(getStoryblokToken("published", { NEXT_PUBLIC_STORYBLOK_TOKEN: "legacy" }), "legacy");
  assert.equal(getStoryblokToken("draft", { NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN: "legacy-preview" }), "legacy-preview");
});

test("missing tokens fail with a typed error", () => {
  assert.throws(() => getStoryblokToken("published", {}), (error) => {
    assert.ok(error instanceof StoryblokDataError);
    assert.equal(error.code, "MISSING_TOKEN");
    return true;
  });
});

test("published requests revalidate while draft requests are never cached", () => {
  const published = getStoryblokFetchOptions("published", ["story:home"]);
  assert.equal(published.cache, "force-cache");
  assert.equal(published.next.revalidate, 3600);
  assert.deepEqual(published.next.tags, ["cms", "story:home"]);
  assert.deepEqual(getStoryblokFetchOptions("draft", ["story:home"]), { cache: "no-store" });
});

async function withToken(callback) {
  const previous = process.env.STORYBLOK_TOKEN;
  process.env.STORYBLOK_TOKEN = "test-token";
  try { await callback(); } finally {
    if (previous === undefined) delete process.env.STORYBLOK_TOKEN;
    else process.env.STORYBLOK_TOKEN = previous;
  }
}

test("429 and 5xx responses are retried", async () => withToken(async () => {
  for (const status of [429, 503]) {
    let calls = 0;
    const result = await requestStoryblok("stories", {
      version: "published",
      fetchImpl: async () => {
        calls++;
        return calls === 1
          ? new Response(null, { status })
          : Response.json({ stories: [] });
      },
      sleep: async () => {},
      random: () => 0,
    });
    assert.deepEqual(result, { stories: [] });
    assert.equal(calls, 2);
  }
}));

test("non-retryable Storyblok API errors are exposed", async () => withToken(async () => {
  await assert.rejects(
    requestStoryblok("stories/missing", {
      version: "published",
      fetchImpl: async () => new Response(null, { status: 404, statusText: "Not Found" }),
    }),
    (error) => error instanceof StoryblokDataError && error.status === 404,
  );
}));

test("Storyblok links retrieval paginates beyond 100 records", async () => withToken(async () => {
  const previousFetch = globalThis.fetch;
  const requestedPages = [];
  globalThis.fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get("page"));
    requestedPages.push(page);
    const size = page === 1 ? 100 : 1;
    const links = Object.fromEntries(Array.from({ length: size }, (_, index) => {
      const id = (page - 1) * 100 + index;
      return [String(id), { id, slug: `story-${id}`, is_folder: false }];
    }));
    return Response.json({ links });
  };
  try {
    const links = await getStoryLinks();
    assert.equal(links.length, 101);
    assert.deepEqual(requestedPages, [1, 2]);
  } finally {
    globalThis.fetch = previousFetch;
  }
}));
