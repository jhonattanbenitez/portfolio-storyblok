"use client";
import { storyblokEditable } from "@storyblok/react/rsc";
import Image from "next/image";
import "highlight.js/styles/github-dark.css";
import "./post-styles.css";

import React from "react";

import formatDate from "../utils/formatDate";
import { useMarkdown } from "../hooks/useMarkdown";

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

const Post: React.FC<PostProps> = ({ blok }) => {

  const {
    html: contentHtml,
    isLoading: contentLoading,
    error: contentError,
  } = useMarkdown(blok?.content);
  const {
    html: introHtml,
    isLoading: introLoading,
    error: introError,
  } = useMarkdown(blok?.intro);

  const isLoading = contentLoading || introLoading;
  const error = contentError || introError;
  
  if (!blok) return <p>Loading...</p>;
  if (isLoading) return <p>Loading content...</p>;
  if (error)
    return <p className="text-destructive">Error loading content: {error}</p>;

  return (
    <>
      <article
        {...storyblokEditable(blok)}
        className="prose prose-lg max-w-full text-foreground"
      >
        {/* Header */}
        <header className="w-full flex justify-center pb-8 pt-24 bg-muted">
          <h1 className="px-4 text-center uppercase font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            {blok.title}
          </h1>
        </header>

        {/* Intro */}
        <section className="bg-muted">
          <div className="container max-w-4xl mx-auto p-4">
            <div
              className="prose max-w-4xl mx-auto text-foreground"
              dangerouslySetInnerHTML={{ __html: introHtml || "" }}
            />
          </div>
        </section>

        {/* Fecha */}
        <div className="bg-muted">
          <div className="container max-w-4xl mx-auto p-4">
            <p className="text-muted-foreground">{formatDate(blok.date)}</p>
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
        <section className="container mx-auto max-w-4xl">
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
};

export default Post;
