import { storyblokEditable } from "@storyblok/react/rsc";
import Image from "next/image";
import "highlight.js/styles/github-dark.css";
import "./post-styles.css";

import formatDate from "../utils/formatDate";
import { markdownToHtml } from "../utils/markdown";

type ImageType = { filename: string };

type Blok = {
  _uid: string;
  title: string;
  intro: string;
  content: string;
  date: string;
  image?: ImageType[];
  component: string;
  _editable?: string;
  language: string;
  slug?: string;
  full_slug?: string;
};

type PostProps = {
  blok?: Blok;
};

export default async function Post({ blok }: PostProps) {
  if (!blok) return <p>Loading...</p>;
  const [contentHtml, introHtml] = await Promise.all([
    markdownToHtml(blok.content),
    markdownToHtml(blok.intro),
  ]);

  return (
    <>
      <article
        {...storyblokEditable(blok)}
        className="prose prose-lg max-w-full text-foreground"
      >
        {/* Header */}
        <header className="flex w-full justify-center bg-muted pb-12 pt-28 md:pb-16 md:pt-32">
          <h1 className="w-full min-w-0 max-w-6xl break-words px-4 text-center uppercase text-4xl font-bold md:text-5xl lg:text-6xl">
            {blok.title}
          </h1>
        </header>

        {/* Intro */}
        <section className="bg-muted">
          <div className="container mx-auto max-w-4xl px-4 pb-4 pt-8 md:pt-12">
            <div
              className="prose mx-auto max-w-4xl text-lg leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: introHtml || "" }}
            />
          </div>
        </section>

        {/* Fecha */}
        <div className="bg-muted">
          <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0">
            <p className="text-sm text-muted-foreground">{formatDate(blok.date)}</p>
          </div>
        </div>

        {/* Imagen */}
        <section className="w-full flex justify-center py-8 bg-muted">
          <div className="relative w-full max-w-6xl h-[60vh] md:h-[70vh] lg:h-[80vh]">
            {blok.image?.length ? (
              <Image
                src={blok.image[0].filename}
                alt={`Cover image for ${blok.title}`}
                fill
                sizes="100vw"
                className="rounded-lg object-cover"
                priority={false}
              />
            ) : null}
          </div>
        </section>

        {/* Contenido */}
        <section className="container mx-auto max-w-4xl py-12 md:py-16">
          <div
            className="
              p-4 rounded-lg overflow-x-auto
              bg-card text-card-foreground border border-border
              prose max-w-none
            "
            dangerouslySetInnerHTML={{ __html: contentHtml || "" }}
          />
        </section>
      </article>
    </>
  );
}
