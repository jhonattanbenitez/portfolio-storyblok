"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useParams } from "next/navigation";
import { fetchStories } from "../utils/fetchStories";
import { Story } from "../utils/types";
import { useTranslation } from "../hooks/useTranslation";
import StoryCard from "../components/StoryCard";

export default function CategoryPageComponent() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const params = useParams();

  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  /** 🌐 Determinar idioma desde la URL */
  const urlLang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first === "es-co") return "es-co";
    return "en";
  })();

  /** 🏷️ Obtener slug de la categoría desde los parámetros */
  const categorySlug = useMemo(() => {
    const raw = params?.slug;
    if (!raw) return "";
    return Array.isArray(raw) ? raw.join("/") : String(raw);
  }, [params]);

  const displayCategory = useMemo(
    () => decodeURIComponent(categorySlug).replace(/-/g, " "),
    [categorySlug]
  );

  /** 🚀 Fetch stories y nombre de la categoría */
  useEffect(() => {
    async function run() {
      setIsLoading(true);

      try {
        const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;
        if (!token || !categorySlug) {
          setCategoryName(null);
          return;
        }

        // 1️⃣ Obtener datos de la categoría
        const params = new URLSearchParams({
          token,
          version: "published",
          language: urlLang,
          fallback_lang: "false",
        });

        const res = await fetch(
          `https://api-us.storyblok.com/v2/cdn/stories/categories/${categorySlug}?${params.toString()}`,
          {
            cache: "default",
            next: {
              tags: ["cms", `cms:${urlLang}`, `category:${categorySlug}`],
            },
          }
        );

        if (res.ok) {
          const json = await res.json();
          const contentName = json?.story?.content?.name;
          const storyName = json?.story?.name;
          setCategoryName(contentName || storyName || displayCategory);
        } else {
          setCategoryName(displayCategory);
        }

        // 2️⃣ Obtener todos los posts
        const storiesData = await fetchStories({
          version: "published",
          language: "en",
        });

        const raw = storiesData?.stories || [];
        const targetLanguage = urlLang === "es-co" ? "spanish" : "english";

        // 3️⃣ Filtrar por idioma y categoría
        const filtered = raw.filter((story) => {
          const langMatch = story.content.language === targetLanguage;

          // Extraer slug de la categoría en el post
          const categoryUrl = story.content?.category_ref?.cached_url || "";
          const categorySlugFromRef = categoryUrl
            .split("/")
            .filter(Boolean)
            .pop();

          const categoryMatch =
            categorySlugFromRef &&
            categorySlugFromRef.toLowerCase() === categorySlug.toLowerCase();

          return langMatch && categoryMatch;
        });

        setStories(filtered);
      } catch (error) {
        console.error("Error fetching category stories:", error);
        setStories([]);
        setCategoryName(displayCategory);
      } finally {
        setIsLoading(false);
      }
    }

    if (categorySlug) run();
  }, [urlLang, categorySlug, displayCategory]);

  const LoadingScreen = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-center text-foreground">{t("common.loading")}</p>
    </div>
  );

  if (isLoading) return LoadingScreen;

  return (
    <Suspense fallback={LoadingScreen}>
      <section className="max-w-full bg-background text-foreground">
        {/* Header */}
        <div className="w-full flex justify-center py-32 mb-8 sm:py-48 lg:py-16 bg-muted">
          <div className="relative w-full max-w-6xl lg:h-[30vh] flex items-center justify-center">
            <h1 className="px-4 py-16 text-center uppercase font-bold text-3xl sm:text-5xl md:text-6xl">
              {t("postHeader.categories")} {"/"} {categoryName}
            </h1>
          </div>
        </div>

        {/* Posts grid */}
        <div className="container mx-auto p-4">
          {stories.length === 0 ? (
            <div className="min-h-[30vh] flex items-center justify-center">
              <p className="text-muted-foreground">{t("posts.noPosts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stories.map((story, index) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  index={index}
                  language={urlLang}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Suspense>
  );
}
