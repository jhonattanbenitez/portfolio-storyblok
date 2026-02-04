"use client";
import React from "react";
import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import Image from "next/image";
import { useMarkdown } from "../hooks/useMarkdown";
import { useTranslation } from "../hooks/useTranslation";
import formatDate from "../utils/formatDate";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import "highlight.js/styles/github-dark.css";
import "./post-styles.css";

interface Alternate {
  id: number;
  name: string;
  slug: string;
  published: true;
  full_slug: string;
  is_folder: boolean;
  parent_id: number;
}

interface CaseStudyProps {
  blok: SbBlokData & {
    title: string;
    intro: string;
    content: string;
    date: string;
    image?: {
      filename: string;
    };
    client?: string;
    services?: string;
    color?: string;
    language?: string;
    slug?: string;
    full_slug?: string;
  };
  alternates?: Alternate[];
  storySlug?: string;
}

const CaseStudy: React.FC<CaseStudyProps> = ({
  blok,
  alternates: storyAlternates,
  storySlug,
}) => {
  const { html: contentHtml } = useMarkdown(blok.content);
  const { html: introHtml } = useMarkdown(blok.intro);
  const { t } = useTranslation();

  const params = useParams();
  const { setSlugMap, language } = useLanguage();
  const { resolvedTheme } = useTheme();

  const extractSlug = (full: string | undefined) => {
    if (!full) return "";
    const parts = full.split("/");
    return parts[parts.length - 1];
  };

  const slugMap = React.useMemo(() => {
    if (!blok) return undefined;

    // Determine current language from context
    const currentLang = language;

    // Determine current slug
    const paramsSlug = Array.isArray(params?.slug)
      ? params.slug[params.slug.length - 1]
      : params?.slug;

    const currentSlug =
      storySlug || blok.slug || extractSlug(blok.full_slug) || paramsSlug || "";

    const alternates = storyAlternates || [];

    // Find the alternate that is NOT the current language
    const alt = alternates.find((a) => a.slug && a.slug !== currentSlug);
    const altSlug = extractSlug(alt?.full_slug);

    const map = {
      [currentLang]: currentSlug,
      [currentLang === "en" ? "es-co" : "en"]: altSlug,
    };
    return map;
  }, [blok, params, storyAlternates, storySlug, language]);

  React.useEffect(() => {
    if (slugMap) setSlugMap(slugMap);
    return () => setSlugMap(undefined);
  }, [slugMap, setSlugMap]);

  return (
    <article
      {...storyblokEditable(blok)}
      className="min-h-screen bg-background text-foreground pb-20 pt-20"
    >
      {/* Hero Header */}
      <div className="relative w-full h-[60vh] md:h-[70vh] bg-muted">
        {blok.image?.filename && (
          <Image
            src={blok.image.filename}
            alt={blok.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container max-w-5xl px-4 text-center text-white">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium hover:underline mb-6 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              {t("common.backToHome")}
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              {blok.title}
            </h1>
            {blok.services && (
              <p className="text-lg md:text-xl font-light text-white/90">
                {blok.services}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 -mt-20 relative z-10">
        {/* Project Details Card */}
        <div
          className="text-card-foreground p-8 md:p-12 rounded-xl shadow-xl border border-border grid md:grid-cols-3 gap-8 mb-16"
          style={{
            backgroundColor: resolvedTheme === "dark" ? "#1e293b" : "#ffffff",
          }}
        >
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-semibold">Overview</h3>
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html: introHtml || blok.intro || "",
              }}
            />
          </div>

          <div className="space-y-6 md:border-l border-border md:pl-8">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Client
              </h4>
              <p className="font-medium">{blok.client || "Confidential"}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Date
              </h4>
              <p className="font-medium">{formatDate(blok.date)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Services
              </h4>
              <p className="font-medium">{blok.services || "Development"}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div
            className="prose prose-xl dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml || "" }}
          />
        </div>
      </div>
    </article>
  );
};

export default CaseStudy;
