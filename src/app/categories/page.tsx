import Link from "next/link";
import { fetchStories } from "../../../utils/fetchStories";

export default async function CategoriesIndexPage() {
  const data = await fetchStories({
    version: "published",
    language: "en",
    startsWith: "categories/",
    perPage: 100,
  });

  const categories = data?.stories ?? [];

  return (
    <section className="max-w-full bg-background text-foreground">
      <div className="w-full flex justify-center py-24 sm:py-32 bg-muted">
        <h1 className="px-4 mt-10 text-center uppercase font-bold text-4xl sm:text-5xl">Categories</h1>
      </div>
      <div className="container mx-auto p-4">
        {categories.length === 0 ? (
          <p className="text-muted-foreground">No categories found.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((cat) => (
              <li key={cat.id} className="p-4 rounded-md border border-border hover:bg-muted/50">
                <Link href={`/categories/${cat.slug}`} className="underline">
                  {cat.name || cat.slug}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}


