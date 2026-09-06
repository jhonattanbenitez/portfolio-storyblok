"use client";

import type { StoryWithRenderedIntro } from "../utils/markdown";
import { useTranslation } from "../hooks/useTranslation";
import StoryCard from "../components/StoryCard";

type PostsPageComponentProps = {
  stories: StoryWithRenderedIntro[];
  locale: "en" | "es-co";
};

export default function PostsPageComponent({
  stories,
  locale,
}: PostsPageComponentProps) {
  const { t } = useTranslation();

  if (!stories.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive text-center">{t("posts.noPosts")}</p>
      </div>
    );
  }

  return (
    <section className="max-w-full bg-background text-foreground">
        {/* Header */}
        <div className="mb-8 flex w-full justify-center bg-muted pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
          <div className="relative flex w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <h1 className="px-4 text-center uppercase font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              {t("postHeader.blog")}
            </h1>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
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
        </div>
    </section>
  );
}
