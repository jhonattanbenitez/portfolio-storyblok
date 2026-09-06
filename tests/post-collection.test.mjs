import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoriesSearchParams,
  filterPostsForLocale,
  getPostContentLanguage,
} from "../lib/storyblok-data.ts";

const englishPost = {
  id: 106899427097798,
  uuid: "aaa6af89-3f10-44f2-a346-509b4a93048d",
  group_id: "40580fee-06b5-492a-9326-df1b0a87ffb1",
  content: {
    language: "english",
    category_ref: { cached_url: "categories/teach-yourself-cs-journey" },
  },
};

const spanishPost = {
  id: 106902154882247,
  uuid: "b592d804-bf15-4434-9559-0fa39415b6a5",
  group_id: "40580fee-06b5-492a-9326-df1b0a87ffb1",
  content: {
    language: "spanish",
    category_ref: { cached_url: "categories/mi-viaje-usando-teachyourselfcs" },
  },
};

test("English collection contains only explicitly English posts", () => {
  assert.deepEqual(filterPostsForLocale([englishPost, spanishPost], "en"), [englishPost]);
});

test("Spanish collection contains only explicitly Spanish posts", () => {
  assert.deepEqual(filterPostsForLocale([englishPost, spanishPost], "es-co"), [spanishPost]);
});

test("independent localized posts retain distinct UUIDs in the same group", () => {
  assert.notEqual(englishPost.uuid, spanishPost.uuid);
  assert.equal(englishPost.group_id, spanishPost.group_id);
});

test("locale selection uses the custom content language field", () => {
  assert.equal(getPostContentLanguage("en"), "english");
  assert.equal(getPostContentLanguage("es-co"), "spanish");
});

test("collection query filters content language without UUID alternate lookup", () => {
  const params = buildStoriesSearchParams({
    version: "published",
    locale: "es-co",
    startsWith: "posts/",
    contentLanguage: "spanish",
  });

  assert.equal(params["filter_query[language][in]"], "spanish");
  assert.equal("by_uuids" in params, false);
  assert.equal(params.language, "es-co");
});

test("category and language filters compose in one collection request", () => {
  const params = buildStoriesSearchParams({
    version: "published",
    locale: "es-co",
    startsWith: "posts/",
    categorySlug: "mi-viaje-usando-teachyourselfcs",
    contentLanguage: "spanish",
  });

  assert.equal(
    params["filter_query[category_ref.cached_url][in]"],
    "categories/mi-viaje-usando-teachyourselfcs",
  );
  assert.equal(params["filter_query[language][in]"], "spanish");
});
