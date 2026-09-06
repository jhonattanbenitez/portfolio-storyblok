"use client";

import type { SupportedLanguage } from "../utils/types";
import type { StoryWithRenderedIntro } from "../utils/markdown";
import { useTranslation } from "../hooks/useTranslation";
import StoryCard from "../components/StoryCard";

export default function CategoryPageComponent({
  stories,
  categoryName,
  locale,
}: {
  stories: StoryWithRenderedIntro[];
  categoryName: string;
  locale: SupportedLanguage;
}) {
  const { t } = useTranslation();

  return (
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
                  language={locale}
                />
              ))}
            </div>
          )}
        </div>
    </section>
  );
}
