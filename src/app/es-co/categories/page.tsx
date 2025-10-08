import Link from "next/link";
import { fetchStories } from "../../../../utils/fetchStories";

export default async function CategoriesIndexPageEs() {
  // 🔹 Obtener historias solo en español (es-co)
  const data = await fetchStories({
    version: "published",
    language: "es-co",
    startsWith: "categories/",
    perPage: 100,
  });

  // 🔹 Filtrar por idioma dentro del contenido, si usas ese campo en Storyblok
  const categories = (data?.stories ?? []).filter(
    (cat) => cat.content?.language === "spanish"
  );

  return (
    <section className="max-w-full bg-background text-foreground">
      {/* Header */}
      <div className="w-full flex justify-center py-24 sm:py-32 bg-muted">
        <h1 className="px-4 mt-10 text-center uppercase font-bold text-4xl sm:text-5xl">
          Categorías
        </h1>
      </div>

      <div className="container mx-auto p-4">
        {categories.length === 0 ? (
          <p className="text-muted-foreground">No se encontraron categorías.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="p-4 rounded-md border border-border hover:bg-muted/50"
              >
                <Link
                  href={`/es-co/categories/${cat.slug}`}
                  className="underline"
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
