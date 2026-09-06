import Link from "next/link";
import { getStories } from "../../../../lib/storyblok-data";
import { deterministicLocalizedUrls, generateMetadataFromStory } from "../../../../utils/seo";

export const metadata = generateMetadataFromStory(null, "es-co", "/es-co/categories", deterministicLocalizedUrls("/categories"));

export default async function CategoriesIndexPageEs() {
  // 🔹 Obtener historias solo en español (es-co)
  const data = await getStories({
    version: "published",
    locale: "es-co",
    startsWith: "categories/",
    perPage: 100,
  });

  // 🔹 Filtrar por idioma dentro del contenido, si usas ese campo en Storyblok
  const categories = data.stories.filter(
    (cat) => cat.content?.language === "spanish"
  );

  return (
    <section className="max-w-full bg-background text-foreground">
      {/* Header */}
      <div className="flex w-full justify-center bg-muted pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-center uppercase font-bold text-4xl sm:text-5xl">
            Categorías
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        {categories.length === 0 ? (
          <p className="text-muted-foreground">No se encontraron categorías.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="rounded-md border border-border transition-colors duration-200 hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
              >
                <Link
                  href={`/es-co/categories/${cat.slug}`}
                  className="block p-4 underline focus-visible:outline-none"
                >
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
