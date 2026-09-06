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
        <div className="mb-8 flex w-full justify-center bg-muted pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
          <div className="relative flex w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <h1 className="text-center uppercase font-bold text-3xl sm:text-5xl md:text-6xl">
              {t("postHeader.categories")} {"/"} {categoryName}
            </h1>
          </div>
        </div>

        {/* Posts grid */}
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
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
