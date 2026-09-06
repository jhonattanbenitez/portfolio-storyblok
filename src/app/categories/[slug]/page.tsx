import CategoryPageComponent from "../../../../components/CategoryPageComponent";
import { getPosts, getStoryBySlug, resolveLocalizedStoryUrls } from "../../../../lib/storyblok-data";
import { generateMetadataFromStory } from "../../../../utils/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getStoryBySlug({ slug: `categories/${slug}`, version: "published", locale: "en" });
  const urls = await resolveLocalizedStoryUrls({ story: category.story, currentLocale: "en", version: "published" });
  return generateMetadataFromStory(category.story, "en", `/categories/${slug}`, urls);
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, stories] = await Promise.all([
    getStoryBySlug({ slug: `categories/${slug}`, version: "published", locale: "en" }),
    getPosts({ version: "published", locale: "en", categorySlug: slug }),
  ]);
  const categoryName = String(category.story.content.name || category.story.name || slug.replace(/-/g, " "));
  return <CategoryPageComponent stories={stories} categoryName={categoryName} locale="en" />;
}
