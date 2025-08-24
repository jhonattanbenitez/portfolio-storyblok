"use client";
import { storyblokEditable } from "@storyblok/react/rsc";
import Image from "next/image";
import Head from "next/head";
import Script from "next/script";
import "highlight.js/styles/github-dark.css";
import "./post-styles.css";

import { useParams } from "next/navigation";
import NavBar from "./NavBar";
import formatDate from "../utils/formatDate";
import { useMarkdown } from "../hooks/useMarkdown";

type ImageType = {
  filename: string;
};

type Blok = {
  _uid: string;
  title: string;
  intro: string;
  content: string;
  date: string;
  image?: ImageType[];
  component: string;
  _editable?: string;
  first_published_at: string;
};

type PostProps = {
  blok?: Blok;
};

const Post: React.FC<PostProps> = ({ blok }) => {
  const params = useParams();
  const slug = params?.slug?.[1];

  // Use the custom hook to process both content and intro
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

  if (!blok) {
    return <p>Loading...</p>;
  }

  if (isLoading) {
    return <p>Loading content...</p>;
  }
  if (error) {
    return <p className="text-red-500">Error loading content: {error}</p>;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blok.title,
    description: blok.intro,
    image: blok.image?.length ? blok.image[0].filename : "",
    datePublished: blok.first_published_at,
    author: {
      "@type": "Person",
      name: "Jhonattan Benitez",
    },
  };

  return (
    <>
      <Head>
        <title>{blok.title}</title>
        <meta name="description" content={blok.intro} />
        <meta
          name="keywords"
          content={`blog, post, ${blok.title}, ${blok.intro}`}
        />
        <meta property="og:title" content={blok.title} />
        <meta property="og:description" content={blok.intro} />
        <meta property="og:image" content={blok.image?.[0]?.filename} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blok.title} />
        <meta name="twitter:description" content={blok.intro} />
        <meta name="twitter:image" content={blok.image?.[0]?.filename} />
        <link
          rel="canonical"
          href={`https://www.jhonattan.dev/posts/${slug}`}
        />
      </Head>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <NavBar />
      <article
        {...storyblokEditable(blok)}
        className="prose prose-lg max-w-full"
      >
        {/* Header Section */}
        <header className="bg-gray-900 w-full flex justify-center pb-8 pt-42">
          <h1 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white uppercase text-center px-4">
            {blok.title}
          </h1>
        </header>

        {/* Intro Section */}
        <section className="bg-gray-900">
          <div className="container mx-auto p-4">
            <div
              className="lg:text-xl text-white"
              dangerouslySetInnerHTML={{ __html: introHtml || "" }}
            />
          </div>
        </section>
        <div className="bg-gray-900">
          <div className="container mx-auto p-4 text-white">
            <p>{formatDate(blok.date)}</p>
          </div>
        </div>

        {/* Image Section */}
        <section className="bg-gray-900 w-full flex justify-center py-8">
          <div className="relative w-full max-w-6xl h-[60vh] md:h-[70vh] lg:h-[80vh]">
            {blok.image?.length ? (
              <Image
                src={blok.image[0].filename}
                alt={`Cover image for ${blok.title}`}
                fill
                sizes="100vw"
                className="rounded-lg"
              />
            ) : null}
          </div>
        </section>

        {/* Content Section */}
        <section className="container mx-auto prose prose-invert">
          <div
            className="p-4 rounded-lg overflow-x-auto content"
            dangerouslySetInnerHTML={{ __html: contentHtml || "" }}
          />
        </section>
      </article>
    </>
  );
};

export default Post;
