import Link from "next/link";
import { getStories } from "../../../lib/storyblok-data";
import { RouteParams, SupportedLanguage } from "../../../utils/types";
import { deterministicLocalizedUrls, generateMetadataFromStory } from "../../../utils/seo";

export const metadata = generateMetadataFromStory(null, "en", "/categories", deterministicLocalizedUrls("/categories"));

export default async function CategoriesIndexPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;

  let urlLang: SupportedLanguage = "en";
  if (slug && slug.length > 0) {
    if (slug[0] === "es-co") {
      urlLang = "es-co";
    }
  }

  const startsWith = urlLang === "es-co" ? "es-co/categories/" : "categories/";
  const targetLanguage = urlLang === "es-co" ? "spanish" : "english";

  const data = await getStories({
    version: "published",
    locale: urlLang,
    startsWith,
    perPage: 100,
  });

  const allCategories = data.stories;

  /** 🧩 Filtrar por idioma correcto */
  const categories = allCategories.filter(
    (cat) => cat.content.language === targetLanguage
  );

  return (
    <main className="max-w-full bg-background text-foreground">
      {/* Header */}  
      <div className="flex w-full justify-center bg-muted pb-16 pt-28 md:pb-24 md:pt-32">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-center uppercase text-4xl font-bold md:text-5xl lg:text-6xl">
            {urlLang === "es-co" ? "Categorías" : "Categories"}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        {categories.length === 0 ? (
          <p className="text-muted-foreground">
            {urlLang === "es-co"
              ? "No se encontraron categorías."
              : "No categories found."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((cat) => {
              const href =
                urlLang === "es-co"
                  ? `/es-co/categories/${cat.slug}`
                  : `/categories/${cat.slug}`;
              return (
                <li
                  key={cat.id}
                  className="rounded-sm border border-border bg-card text-card-foreground transition-colors duration-200 hover:border-primary/40 hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
                >
                  <Link href={href} className="block p-4 font-semibold focus-visible:outline-none">
                    {cat.name || cat.slug}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
