import type { MetadataRoute } from "next";
import {
  getAllStories,
  getStoriesByUuids,
  getStoryBySlug,
  resolveLocalizedStoryUrls,
} from "../../lib/storyblok-data";
import {
  buildSitemapEntries,
  deterministicLocalizedUrls,
} from "../../utils/seo";
import type { LocalizedUrl, Story, StoryblokBlock, SupportedLanguage } from "../../utils/types";

const STATIC_PAIRS = ["/", "/posts", "/case-studies", "/categories", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allStories, caseStudiesHome] = await Promise.all([
    getAllStories("published"),
    getStoryBySlug({
      slug: "case-studies/home",
      version: "published",
      locale: "en",
      resolveRelations: "case_studies_section.case_studies",
    }),
  ]);
  const byId = new Map(allStories.map((story) => [story.id, story]));
  const byUuid = new Map(allStories.map((story) => [story.uuid, story]));
  const body = caseStudiesHome.story.content.body || [];
  const section = body.find((block: StoryblokBlock) => block.component === "case_studies_section");
  const relation = Array.isArray(section?.case_studies) ? section.case_studies : [];
  const englishCaseStudies: Story[] = relation.filter(
    (item): item is Story => typeof item === "object" && item !== null && "uuid" in item,
  );
  if (!englishCaseStudies.length) {
    const uuids = relation.filter((item): item is string => typeof item === "string");
    englishCaseStudies.push(...await getStoriesByUuids({ uuids, version: "published", locale: "en" }));
  }

  const pages: Array<{ url: LocalizedUrl; alternates?: LocalizedUrl[]; lastModified?: string }> = [];
  for (const path of STATIC_PAIRS) {
    const urls = deterministicLocalizedUrls(path);
    pages.push(...urls.map((url) => ({ url, alternates: urls })));
  }
  pages.push({ url: { locale: "en", href: "/landing" } });

  const independentStories = allStories.filter((story) =>
    story.content.component === "post" || story.content.component === "Category"
  );
  for (const story of independentStories) {
    const locale: SupportedLanguage = story.content.language === "spanish" ? "es-co" : "en";
    const urls = await resolveLocalizedStoryUrls({
      story,
      currentLocale: locale,
      version: "published",
      fetchAlternate: async () => {
        const reference = story.alternates[0];
        return reference ? byId.get(reference.id) || null : null;
      },
    });
    pages.push(...urls.map((url) => ({ url, alternates: urls, lastModified: story.updated_at })));
  }

  for (const englishStory of englishCaseStudies) {
    const canonicalStory = byUuid.get(englishStory.uuid) || englishStory;
    const urls = await resolveLocalizedStoryUrls({
      story: canonicalStory,
      currentLocale: "en",
      version: "published",
      fetchAlternate: async () => {
        const reference = canonicalStory.alternates[0];
        return reference ? byId.get(reference.id) || null : null;
      },
    });
    pages.push(...urls.map((url) => ({ url, alternates: urls, lastModified: canonicalStory.updated_at })));
  }

  return buildSitemapEntries(pages);
}
