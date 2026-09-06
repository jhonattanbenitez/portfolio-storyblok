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
        className="post-article max-w-full text-foreground"
      >
        {/* Editorial header */}
        <header className="bg-muted pb-10 pt-28 md:pb-12 md:pt-32">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h1 className="w-full min-w-0 break-words text-center uppercase text-4xl font-bold md:text-5xl lg:text-6xl">
              {blok.title}
            </h1>
          </div>
          <div className="mx-auto mt-8 max-w-4xl px-4 md:mt-12">
            <div
              className="prose post-intro max-w-none text-lg leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: introHtml || "" }}
            />
            <p className="mt-4 text-sm text-muted-foreground">
              {formatDate(blok.date)}
            </p>
          </div>
        </header>

        {/* Hero image */}
        <section className="flex w-full justify-center bg-muted px-4 pb-12 md:pb-16">
          <div className="relative h-[60vh] w-full max-w-6xl md:h-[70vh] lg:h-[80vh]">
            {blok.image?.length ? (
              <Image
                src={blok.image[0].filename}
                alt={`Cover image for ${blok.title}`}
                fill
                sizes="100vw"
                className="rounded-sm object-cover"
                priority={false}
              />
            ) : null}
          </div>
        </section>

        {/* Article body */}
        <section className="mx-auto max-w-4xl px-4 py-12 md:py-16">
          <div
            className="post-body prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml || "" }}
          />
        </section>
      </article>
    </>
  );
}
