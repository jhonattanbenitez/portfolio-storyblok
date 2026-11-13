import { permanentRedirect } from "next/navigation";
import CategoryPageComponent from "../../../../components/CategoryPageComponent";
import { AlternateLinksPublisher } from "../../../../contexts/AlternateLinksContext";
import { getPosts, getStoryBySlug, resolveLocalizedStoryUrls, resolveStoryRouteRedirect } from "../../../../lib/storyblok-data";
import { generateMetadataFromStory, generateRedirectMetadata } from "../../../../utils/seo";
import { renderStoryIntros } from "../../../../utils/markdown";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const category = await getStoryBySlug({ slug: `categories/${slug}`, version: "published", locale: "en" });
  const redirectHref = await resolveStoryRouteRedirect({ story: category.story, locale: "en", version: "published" });
  if (redirectHref) return generateRedirectMetadata(redirectHref);
  const urls = await resolveLocalizedStoryUrls({ story: category.story, currentLocale: "en", version: "published" });
  return generateMetadataFromStory(category.story, "en", `/categories/${slug}`, urls);
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await getStoryBySlug({ slug: `categories/${slug}`, version: "published", locale: "en" });
  const redirectHref = await resolveStoryRouteRedirect({
    story: category.story, locale: "en", version: "published", searchParams: await searchParams,
  });
  if (redirectHref) permanentRedirect(redirectHref);
  const [stories, urls] = await Promise.all([
    getPosts({ version: "published", locale: "en", categorySlug: slug }),
    resolveLocalizedStoryUrls({ story: category.story, currentLocale: "en", version: "published" }),
  ]);
  const categoryName = String(category.story.content.name || category.story.name || slug.replace(/-/g, " "));
  return <>
    <AlternateLinksPublisher urls={urls} />
    <CategoryPageComponent stories={await renderStoryIntros(stories)} categoryName={categoryName} locale="en" />
  </>;
}
