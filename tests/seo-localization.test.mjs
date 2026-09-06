import assert from "node:assert/strict";
import test from "node:test";

import {
  absoluteUrl,
  buildSitemapEntries,
  generateMetadataFromStory,
  generateStructuredData,
  metadataLanguages,
} from "../utils/seo.ts";

const postUrls = [
  { locale: "en", href: "/posts/conventional-interfaces-and-generic-operations" },
  { locale: "es-co", href: "/es-co/posts/interfaces-convencionales-y-operaciones-genericas" },
];
const caseStudyUrls = [
  { locale: "en", href: "/case-studies/logistics-and-financial-optimization-for-delivery-businesses-a-tailored-management-system" },
  { locale: "es-co", href: "/es-co/case-studies/optimizacion-logistica-y-financiera-para-negocios-de-domicilios-un-sistema-de-gestion-a-medida" },
];
const story = {
  name: "Story",
  full_slug: "posts/story",
  first_published_at: "2025-01-01",
  updated_at: "2025-02-01",
  content: {
    component: "post",
    title: "Localized story",
    intro: "Description",
    image: [],
  },
};

test("English and Spanish posts canonicalize to their own public URLs", () => {
  const english = generateMetadataFromStory(story, "en", postUrls[0].href, postUrls);
  const spanish = generateMetadataFromStory(story, "es-co", postUrls[1].href, postUrls);
  assert.equal(english.alternates.canonical, absoluteUrl(postUrls[0].href));
  assert.equal(spanish.alternates.canonical, absoluteUrl(postUrls[1].href));
});

test("detail hreflang uses page-specific validated destinations", () => {
  for (const urls of [postUrls, caseStudyUrls]) {
    assert.deepEqual(metadataLanguages(urls), {
      en: absoluteUrl(urls[0].href),
      "es-CO": absoluteUrl(urls[1].href),
      "x-default": absoluteUrl(urls[0].href),
    });
  }
});

test("missing alternates advertise only the current locale", () => {
  const current = [postUrls[0]];
  assert.deepEqual(metadataLanguages(current), {
    en: absoluteUrl(postUrls[0].href),
    "x-default": absoluteUrl(postUrls[0].href),
  });
});

test("Open Graph locales and URLs match each localized canonical", () => {
  const english = generateMetadataFromStory(story, "en", postUrls[0].href, postUrls);
  const spanish = generateMetadataFromStory(story, "es-co", postUrls[1].href, postUrls);
  assert.equal(english.openGraph.locale, "en_US");
  assert.deepEqual(english.openGraph.alternateLocale, ["es_CO"]);
  assert.equal(spanish.openGraph.locale, "es_CO");
  assert.deepEqual(spanish.openGraph.alternateLocale, ["en_US"]);
  assert.equal(spanish.openGraph.url, absoluteUrl(postUrls[1].href));
});

test("structured data uses the localized canonical and language", () => {
  const english = generateStructuredData(story, "en", postUrls[0].href);
  const spanish = generateStructuredData(story, "es-co", postUrls[1].href);
  assert.equal(english.url, absoluteUrl(postUrls[0].href));
  assert.equal(english.inLanguage, "en");
  assert.equal(spanish.url, absoluteUrl(postUrls[1].href));
  assert.equal(spanish.inLanguage, "es-CO");
});

test("sitemap contains both localized post and case-study variants without duplicates", () => {
  const pages = [...postUrls, ...caseStudyUrls, postUrls[0]].map((url) => ({ url }));
  const sitemap = buildSitemapEntries(pages);
  const urls = sitemap.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const localized of [...postUrls, ...caseStudyUrls]) {
    assert.ok(urls.includes(absoluteUrl(localized.href)));
  }
  assert.equal(urls.some((url) => url.includes("/es/")), false);
  assert.equal(urls.some((url) => url.includes("www.jhonattan.dev")), false);
});
