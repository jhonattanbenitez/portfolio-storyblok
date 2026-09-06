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
    <section className="max-w-full bg-background text-foreground">
      {/* Header */}  
      <div className="w-full flex justify-center py-24 sm:py-32 bg-muted">
        <h1 className="px-4 mt-10 text-center uppercase font-bold text-4xl sm:text-5xl">
          {urlLang === "es-co" ? "Categorías" : "Categories"}
        </h1>
      </div>

      <div className="container mx-auto p-4">
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
                  className="p-4 rounded-md border border-border hover:bg-muted/50"
                >
                  <Link href={href} className="underline">
                    {cat.name || cat.slug}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
