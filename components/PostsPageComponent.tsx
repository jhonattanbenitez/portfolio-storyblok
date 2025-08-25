"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchStories } from "../utils/fetchStories";
import { Story } from "../utils/types";
import NavBar from "../components/NavBar";
import { useTranslation } from "../hooks/useTranslation";
import { usePathname } from "next/navigation";
import StoryCard from "../components/StoryCard";

export default function PostsPageComponent() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const pathname = usePathname();

  // Determine language from URL
  const urlLang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first === "es-co" || first === "es") return "es-co";
    return "en";
  })();

  const urlPrefix = urlLang === "es-co" ? "/es-co" : "";

  useEffect(() => {
    async function getStories() {
      setIsLoading(true);
      try {
        const storiesData = await fetchStories({
          version: "published",
          language: urlLang,
        });
        setStories(storiesData ? storiesData.stories : []);
      } catch (error) {
        console.error("Error fetching stories:", error);
        setStories([]);
      } finally {
        setIsLoading(false);
      }
    }
    getStories();
  }, [urlLang]);

  const LoadingScreen = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-center text-foreground">{t("common.loading")}</p>
    </div>
  );

  if (isLoading) return LoadingScreen;

  if (!stories.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive text-center">{t("posts.noPosts")}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={LoadingScreen}>
      <section className="max-w-full bg-background text-foreground">
        {/* Header */}
        <NavBar />
        <div className="w-full flex justify-center py-32 mb-8 sm:py-48 lg:py-16 bg-muted">
          <div className="relative w-full max-w-6xl lg:h-[50vh] flex items-center justify-center">
            <h1 className="px-4 text-center uppercase font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              {t("postHeader.blog")}
            </h1>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                index={index}
                urlPrefix={urlPrefix}
              />
            ))}
          </div>
        </div>
      </section>
    </Suspense>
  );
}
