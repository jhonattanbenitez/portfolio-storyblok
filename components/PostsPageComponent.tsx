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
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive text-center">{t("posts.noPosts")}</p>
      </main>
    );
  }

  return (
    <main className="max-w-full bg-background text-foreground">
        {/* Header */}
        <div className="flex w-full justify-center bg-muted pb-16 pt-28 md:pb-24 md:pt-32">
          <div className="relative flex w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <h1 className="px-4 text-center uppercase text-4xl font-bold md:text-5xl lg:text-6xl">
              {t("postHeader.blog")}
            </h1>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
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
    </main>
  );
}
