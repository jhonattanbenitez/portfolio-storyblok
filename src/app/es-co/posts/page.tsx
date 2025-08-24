"use client";

import { Suspense, useEffect, useState } from "react";
import { fetchStories } from "../../../../utils/fetchStories";
import { Story } from "../../../../utils/types";
import NavBar from "../../../../components/NavBar";
import { useTranslation } from "../../../../hooks/useTranslation";
import StoryCard from "../../../../components/StoryCard";
import { usePathname } from "next/navigation";

export default function PostsPage() {
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

  useEffect(() => {
    async function getStories() {
      setIsLoading(true);
      const storiesData = await fetchStories({
        version: "published",
        language: urlLang,
      });
      if (storiesData) {
        setStories(storiesData.stories);
      }
      setIsLoading(false);
    }

    getStories();
  }, [urlLang]);

  if (isLoading) {
    return <p className="text-center text-gray-900">Cargando...</p>;
  }

  if (!stories.length) {
    return <p className="text-red-500 text-center">No hay publicaciones</p>;
  }

  return (
    <Suspense
      fallback={<p className="text-center text-gray-900">Loading...</p>}
    >
      <section className="max-w-full">
        {/* Header Section */}
        <NavBar />
        <div className="bg-gray-900 w-full flex justify-center  py-32 mb-8 sm:py-48 lg:py-16">
          <div className="relative w-full max-w-6xl lg:h-[50vh] flex items-center justify-center">
            <h1 className="text-7xl font-bold text-white uppercase text-center">
              {t("nav.blog")}
            </h1>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="container mx-auto p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, index) => (
              <StoryCard key={story.id} story={story} index={index} />
            ))}
          </div>
        </div>
      </section>
    </Suspense>
  );
}