"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useParams } from "next/navigation";
import { fetchStories } from "../utils/fetchStories";
import { Story } from "../utils/types";
import { useTranslation } from "../hooks/useTranslation";
import StoryCard from "../components/StoryCard";

type SupportedLang = "en" | "es-co" | "es";

export default function CategoryPageComponent() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const params = useParams();

  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  const language: SupportedLang = useMemo(() => {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first === "es-co" || first === "es") return "es-co";
    return "en";
  }, [pathname]);

  const urlPrefix = language === "es-co" ? "/es-co" : "";

  const categorySlug = useMemo(() => {
    const raw = params?.slug;
    if (!raw) return "";
    if (Array.isArray(raw)) return raw.join("/");
    return String(raw);
  }, [params]);

  const displayCategory = useMemo(() => {
    return decodeURIComponent(categorySlug).replace(/-/g, " ");
  }, [categorySlug]);

  useEffect(() => {
    async function run() {
      setIsLoading(true);
      try {
        // Fetch category to get its localized display name
        const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;
        if (token && categorySlug) {
          const params = new URLSearchParams({
            token,
            version: "published",
            language,
            fallback_lang: "false",
          });
          const res = await fetch(
            `https://api-us.storyblok.com/v2/cdn/stories/categories/${categorySlug}?${params.toString()}`,
            { cache: "default", next: { tags: [
              "cms",
              `cms:${language}`,
              `category:${categorySlug}`,
            ] } }
          );
          if (res.ok) {
            const json = await res.json();
            const contentName = json?.story?.content?.name as string | undefined;
            const storyName = json?.story?.name as string | undefined;
            setCategoryName(contentName || storyName || null);
          } else {
            setCategoryName(null);
          }
        } else {
          setCategoryName(null);
        }

        const data = await fetchStories({
          version: "published",
          language,
          categorySlug,
        });
        setStories(data ? data.stories : []);
      } catch (e) {
        console.error("Error fetching category stories:", e);
        setStories([]);
      } finally {
        setIsLoading(false);
      }
    }
    if (categorySlug) run();
  }, [language, categorySlug]);

  const LoadingScreen = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-center text-foreground">{t("common.loading")}</p>
    </div>
  );

  if (isLoading) return LoadingScreen;

  return (
    <Suspense fallback={LoadingScreen}>
      <section className="max-w-full bg-background text-foreground">
        <div className="w-full flex justify-center py-32 mb-8 sm:py-48 lg:py-16 bg-muted">
          <div className="relative w-full max-w-6xl lg:h-[30vh] flex items-center justify-center">
            <h1 className="px-4 py-16 text-center uppercase font-bold text-3xl sm:text-5xl md:text-6xl">
              {t("postHeader.categories")} {"/"} {categoryName || displayCategory}
            </h1>
          </div>
        </div>

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
                  urlPrefix={urlPrefix}
                  language={language}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Suspense>
  );
}


