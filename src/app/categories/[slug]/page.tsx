import CategoryPageComponent from "../../../../components/CategoryPageComponent";
import { getPosts, getStoryBySlug } from "../../../../lib/storyblok-data";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, stories] = await Promise.all([
    getStoryBySlug({ slug: `categories/${slug}`, version: "published", locale: "en" }),
    getPosts({ version: "published", locale: "en", categorySlug: slug }),
  ]);
  const categoryName = String(category.story.content.name || category.story.name || slug.replace(/-/g, " "));
  return <CategoryPageComponent stories={stories} categoryName={categoryName} locale="en" />;
}

