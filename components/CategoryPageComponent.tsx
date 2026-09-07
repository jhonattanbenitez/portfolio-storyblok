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
    <main className="max-w-full bg-background text-foreground">
        {/* Header */}
        <div className="flex w-full justify-center bg-muted pb-16 pt-28 md:pb-24 md:pt-32">
          <div className="relative flex w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <h1 className="text-center uppercase text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
              {t("postHeader.categories")} {"/"} {categoryName}
            </h1>
          </div>
        </div>

        {/* Posts grid */}
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
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
    </main>
  );
}
