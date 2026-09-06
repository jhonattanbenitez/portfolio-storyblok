import assert from "node:assert/strict";
import test from "node:test";

import {
  getCaseStudyHref,
  resolveCaseStudyStoriesForLocale,
} from "../utils/resolveCaseStudyStories.ts";
import { en } from "../translations/en.ts";
import { es } from "../translations/es.ts";

const englishUuid = "aa683166-546b-46ef-86f2-8ef4933187ab";
const spanishUuid = "b2211d63-0c40-47a6-b75b-c38b2a85749c";

function alternate(story) {
  return {
    id: story.id,
    name: story.name,
    slug: story.slug,
    full_slug: story.full_slug.replace(/^es-co\//, ""),
    published: true,
    is_folder: false,
    parent_id: story.parent_id,
  };
}

function story({ id, uuid, slug, groupId = "translation-group" }) {
  return {
    id,
    uuid,
    name: slug,
    slug,
    full_slug: `case-studies/${slug}`,
    group_id: groupId,
    parent_id: 10,
    alternates: [],
    content: { component: "case_study", title: slug },
  };
}

function pair({ sameSlug = false } = {}) {
  const english = story({ id: 1, uuid: englishUuid, slug: sameSlug ? "shared" : "english" });
  const spanish = story({ id: 2, uuid: spanishUuid, slug: sameSlug ? "shared" : "spanish" });
  spanish.full_slug = `es-co/${spanish.full_slug}`;
  english.alternates = [alternate(spanish)];
  spanish.alternates = [alternate(english)];
  return { english, spanish };
}

async function resolve(stories, locale, fetched, warnings = []) {
  return resolveCaseStudyStoriesForLocale({
    stories,
    locale,
    version: "published",
    fetchAlternate: async () => fetched,
    onWarning: (message) => warnings.push(message),
  });
}

test("English collection keeps the referenced English story", async () => {
  const { english } = pair();
  const result = await resolve([english], "en", null);
  assert.equal(result[0].uuid, englishUuid);
});

test("Spanish collection follows the alternate to the distinct Spanish UUID", async () => {
  const { english, spanish } = pair();
  const result = await resolve([english], "es-co", spanish);
  assert.equal(result[0].uuid, spanishUuid);
  assert.notEqual(result[0].uuid, english.uuid);
});

test("mismatched group_id is rejected safely", async () => {
  const { english, spanish } = pair();
  spanish.group_id = "wrong-group";
  const warnings = [];
  assert.deepEqual(await resolve([english], "es-co", spanish, warnings), []);
  assert.match(warnings[0], /group_id/);
});

test("missing alternate is omitted predictably", async () => {
  const { english } = pair();
  english.alternates = [];
  const warnings = [];
  assert.deepEqual(await resolve([english], "es-co", null, warnings), []);
  assert.match(warnings[0], /expected one alternate/);
});

test("unpublished alternate is omitted predictably", async () => {
  const { english, spanish } = pair();
  english.alternates[0].published = false;
  const warnings = [];
  assert.deepEqual(await resolve([english], "es-co", spanish, warnings), []);
  assert.match(warnings[0], /unpublished/);
});

test("multiple alternates are ambiguous and not selected", async () => {
  const { english, spanish } = pair();
  english.alternates.push({ ...alternate(spanish), id: 3 });
  const warnings = [];
  assert.deepEqual(await resolve([english], "es-co", spanish, warnings), []);
  assert.match(warnings[0], /found 2/);
});

test("same-slug counterparts resolve by alternate identity", async () => {
  const { english, spanish } = pair({ sameSlug: true });
  const result = await resolve([english], "es-co", spanish);
  assert.equal(result[0].id, spanish.id);
});

test("card href uses each story's actual localized full_slug", () => {
  assert.equal(getCaseStudyHref("case-studies/english"), "/case-studies/english");
  assert.equal(
    getCaseStudyHref("es-co/case-studies/spanish"),
    "/es-co/case-studies/spanish",
  );
});

test("case-study card copy is localized", () => {
  assert.equal(en.caseStudies.readCaseStudy, "Read Case Study");
  assert.equal(es.caseStudies.readCaseStudy, "Leer caso de estudio");
});
