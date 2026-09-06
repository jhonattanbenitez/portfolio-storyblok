import assert from "node:assert/strict";
import test from "node:test";

import { resolveLocalizedStoryUrls } from "../lib/storyblok-data.ts";
import {
  appendQueryString,
  buildLocalizedStoryHref,
  switchPathLocale,
} from "../utils/storyUrls.ts";

function story({ id, uuid, slug, component, language, groupId = "group" }) {
  return {
    id,
    uuid,
    name: slug,
    slug,
    full_slug: `${component === "post" ? "posts" : "case-studies"}/${slug}`,
    group_id: groupId,
    parent_id: 1,
    alternates: [],
    content: { component, language, title: slug },
  };
}

function pair(component, { sameSlug = false } = {}) {
  const english = story({
    id: 1,
    uuid: `${component}-en`,
    slug: sameSlug ? "shared" : "english-detail",
    component,
    language: component === "post" ? "english" : undefined,
  });
  const spanish = story({
    id: 2,
    uuid: `${component}-es`,
    slug: sameSlug ? "shared" : "spanish-detail",
    component,
    language: component === "post" ? "spanish" : undefined,
  });
  english.alternates = [{
    id: spanish.id, name: spanish.name, slug: spanish.slug,
    full_slug: spanish.full_slug, published: true, is_folder: false, parent_id: 1,
  }];
  spanish.alternates = [{
    id: english.id, name: english.name, slug: english.slug,
    full_slug: english.full_slug, published: true, is_folder: false, parent_id: 1,
  }];
  return { english, spanish };
}

async function urls(current, alternate, locale, warnings = []) {
  return resolveLocalizedStoryUrls({
    story: current,
    currentLocale: locale,
    version: "published",
    fetchAlternate: async () => alternate,
    onWarning: (warning) => warnings.push(warning),
  });
}

for (const component of ["post", "case_study"]) {
  test(`English ${component} resolves its Spanish destination`, async () => {
    const { english, spanish } = pair(component);
    assert.deepEqual(await urls(english, spanish, "en"), [
      { locale: "en", href: `/${english.full_slug}` },
      { locale: "es-co", href: `/es-co/${spanish.full_slug}` },
    ]);
  });

  test(`Spanish ${component} resolves its English destination`, async () => {
    const { english, spanish } = pair(component);
    assert.deepEqual(await urls(spanish, english, "es-co"), [
      { locale: "es-co", href: `/es-co/${spanish.full_slug}` },
      { locale: "en", href: `/${english.full_slug}` },
    ]);
  });
}

test("identical translated slugs resolve by alternate identity", async () => {
  const { english, spanish } = pair("post", { sameSlug: true });
  const result = await urls(english, spanish, "en");
  assert.equal(result[1].href, "/es-co/posts/shared");
});

for (const scenario of ["missing", "unpublished", "group", "non-mutual"]) {
  test(`${scenario} alternate leaves only the current destination`, async () => {
    const { english, spanish } = pair("case_study");
    if (scenario === "missing") english.alternates = [];
    if (scenario === "unpublished") english.alternates[0].published = false;
    if (scenario === "group") spanish.group_id = "different";
    if (scenario === "non-mutual") spanish.alternates = [];
    const warnings = [];
    assert.deepEqual(await urls(english, spanish, "en", warnings), [
      { locale: "en", href: "/case-studies/english-detail" },
    ]);
    assert.equal(warnings.length, 1);
  });
}

test("post content.language is an additional validation signal", async () => {
  const { english, spanish } = pair("post");
  spanish.content.language = "english";
  const warnings = [];
  assert.equal((await urls(english, spanish, "en", warnings)).length, 1);
  assert.match(warnings[0], /content.language/);
});

test("localized URL construction strips synthetic locale prefixes", () => {
  assert.equal(buildLocalizedStoryHref("es-co/posts/spanish", "es-co"), "/es-co/posts/spanish");
  assert.equal(buildLocalizedStoryHref("es-co/posts/spanish", "en"), "/posts/spanish");
});

test("query strings are preserved without replacing browser history", () => {
  assert.equal(appendQueryString("/es-co/posts/bar", "ref=linkedin"), "/es-co/posts/bar?ref=linkedin");
});

test("generic locale switching adds and removes only the locale prefix", () => {
  assert.equal(switchPathLocale("/posts", "es-co"), "/es-co/posts");
  assert.equal(switchPathLocale("/es-co/posts", "en"), "/posts");
});
