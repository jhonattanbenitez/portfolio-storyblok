"use client";
import Link from "next/link";
import Image from "next/image";
import type { StoryWithRenderedIntro } from "../utils/markdown";
import formatDate from "../utils/formatDate";

interface StoryCardProps {
  story: StoryWithRenderedIntro;
  index: number;
  language?: "en" | "es-co";
}

const StoryCard: React.FC<StoryCardProps> = ({ story, index, language = "en" }) => {
  const projectedHref = story.editorial?.href;
  // Metadata is supplied by the validated server catalog. Fail closed if a
  // projected card is ever handed another locale or a malformed destination.
  if (story.editorial) {
    const prefix = language === "es-co" ? "/es-co/posts/" : "/posts/";
    const leaf = projectedHref?.startsWith(prefix) ? projectedHref.slice(prefix.length) : "";
    const matchedLeaf = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(leaf);
    if (story.editorial.locale !== language || !matchedLeaf || matchedLeaf[0] !== leaf || leaf.length > 160) return null;
  }
  const normalizedLang = (language || "en").toLowerCase();
  const isPreferredLang = (lang?: string) => {
    const l = (lang || "").toLowerCase();
    if (normalizedLang === "es-co") return l === "es-co" || l === "es";
    return l === normalizedLang;
  };
  interface TranslatedSlug {
    lang?: string;
    path?: string;
    slug?: string;
  }
  
  const translated = Array.isArray(story.translated_slugs)
    ? story.translated_slugs.find((t: TranslatedSlug) => isPreferredLang(t?.lang))
    : undefined;

  // Normalize translated path: remove leading en/ for default language
  const translatedPath = (() => {
    const p = translated?.path;
    if (!p) return undefined;
    if (normalizedLang === "en" && (p.startsWith("en/") || p.startsWith("/en/"))) {
      return p.replace(/^\/?en\//, "");
    }
    return p;
  })();

  const basePosts = normalizedLang === "en" ? "posts" : normalizedLang + "/posts";

  // If we only have the translated slug (no path), construct it
  const translatedSlugPath = translated?.slug
    ? `${basePosts}/${translated.slug}`
    : undefined;

  const storyLangNormalized = (story.lang || "").toLowerCase();
  const localizedPath = translatedPath
    || translatedSlugPath
    || (isPreferredLang(storyLangNormalized) ? story.full_slug : undefined)
    || `${basePosts}/${story.slug}`;

  const href = projectedHref ?? (localizedPath.startsWith("/") ? localizedPath : `/${localizedPath}`);

  return (
    <div
      className="
        group flex h-full flex-col rounded-sm border border-border
        bg-card text-card-foreground
        transition-colors duration-200
        hover:border-primary/40 hover:shadow-sm
      "
    >
      <Link
        href={href}
        className="flex flex-grow flex-col rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={story.content.title}
      >
        <div className="relative mb-4 aspect-video w-full flex-shrink-0 overflow-hidden border-b border-border">
          {story.content.image?.[0]?.filename && (
            <Image
              src={
                story.content.image[0].filename +
                "/m/800x450/filters:format(webp):quality(80)/"
              }
              alt={story.name}
              width={800}
              height={450}
              priority={index === 0}
              className="h-full w-full object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          )}
        </div>
        {/* Title */}          
        <h2
          className="
            !m-4 !text-lg font-semibold uppercase
            transition-colors
            group-hover:text-foreground
          "
        >
          {story.content.title}
        </h2>

        {/* Intro */}
        <div
          className="
            m-4 text-sm leading-5
            text-muted-foreground transition-colors
            group-hover:text-foreground
          "
          dangerouslySetInnerHTML={{
            __html: story.introHtml,
          }}
        />

        {/* Spacer */}
        <div className="flex-grow" />

        <div className="flex justify-end">
          <p
            className="
              text-xs text-muted-foreground
              transition-colors group-hover:text-foreground
              !m-4
            "
          >
            {formatDate(story.content.date)}
          </p>
        </div>
      </Link>
    </div>
  );
};

export default StoryCard;
