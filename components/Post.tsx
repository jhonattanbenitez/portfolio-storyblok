"use client";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { useEffect, useState } from "react";
import { storyblokEditable } from "@storyblok/react/rsc";
import Image from "next/image";
import "highlight.js/styles/github-dark.css"; // Predefined theme

type ImageType = {
  filename: string;
};

type Blok = {
  _uid: string;
  title: string;
  intro: string;
  content: string;
  image?: ImageType[];
  component: string;
  _editable?: string;
};

type PostProps = {
  blok?: Blok;
};

const processMarkdown = async (content: string) => {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight) // Syntax highlighting
    .use(rehypeStringify)
    .process(content);

  return result.toString();
};

const Post: React.FC<PostProps> = ({ blok }) => {
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    if (blok?.content) {
      processMarkdown(blok.content).then((html) => {
        setHtmlContent(html);
      });
    }
  }, [blok]);

  if (!blok) {
    return <p>Loading...</p>;
  }

  return (
    <article {...storyblokEditable(blok)} className="prose prose-lg max-w-full">
      {/* Header Section */}
      <div className="bg-gray-900 w-full flex justify-center py-8">
        <h1 className="text-7xl font-bold text-white uppercase text-center">
          {blok.title}
        </h1>
      </div>

      {/* Intro Section */}
      <div className="bg-gray-900">
        <div className="container mx-auto p-8">
          <p className="text-xl text-white">{blok.intro}</p>
        </div>
      </div>

      {/* Image Section */}
      <div className="bg-gray-900 w-full flex justify-center py-8">
        <div className="relative w-full max-w-6xl h-[60vh] md:h-[70vh] lg:h-[80vh]">
          {blok.image?.length ? (
            <Image
              src={blok.image[0].filename}
              alt={blok.title}
              fill
              sizes="100vw"
              className="rounded-lg"
            />
          ) : null}
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto p-8 prose prose-invert">
        <style>
          {`
            .hljs {
              background: #1e1e1e; /* Dark background */
              color: #f8f8f2; 
              padding: 1rem;
              border-radius: 0.5rem;
              margin: 1rem 0;
            }
            .hljs-keyword {
              color: #ff79c6; /* Pink for keywords */
            }
            .hljs-string {
              color: #f1fa8c; /* Yellow for strings */
            }
            .hljs-comment {
              color: #6272a4; /* Gray for comments */
            }
            .hljs-title {
              color: #50fa7b; /* Green for titles */
            }
            .hljs-number {
              color: #bd93f9; /* Purple for numbers */
            }
            hr {
              border: 1px solid #4a5568; /* Gray border */
              margin: 2rem 0;
            }
            p {
              margin: 1rem 0;
            }
            table {
              width: 100%;
              border-collapse: separate;
              margin: 1rem 0;
            }
            th, td {
              padding: 1rem; /* Add padding to cells */
              border: 1px solid #fafafa; /* Gray border */
              border-radius: 0.5rem; /* Rounded corners */
            }
            th {
              background-color: #2d3748; /* Dark gray background for headers */
              color: #fff; /* White text for headers */
              font-weight: bold;
            }
            td {
              background-color: #fafafa; /* Darker gray background for cells */
              color: #000; /* Light gray text for cells */
            }

            /* Heading Styles */
            h2 {
              font-size: clamp(22px, 3.4vw, 28px); /* Custom size for h2 */
              margin: 1.75rem 0 0.875rem;
            }
            h3 {
              font-size: clamp(20px, 3vw, 24px); /* Slightly smaller than h2 */
              margin: 1.5rem 0 0.75rem;
            }
            h4 {
              font-size: clamp(18px, 2.6vw, 22px); /* Smaller than h3 */
              margin: 1.25rem 0 0.625rem;
            }
            h5 {
              font-size: clamp(16px, 2.2vw, 20px); /* Smaller than h4 */
              margin: 1rem 0 0.5rem;
            }
            h6 {
              font-size: clamp(14px, 2vw, 18px); /* Smallest size for h6 */
              margin: 0.875rem 0 0.4375rem;
            }
          `}
        </style>
        <div
          className="p-4 rounded-lg overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </article>
  );
};

export default Post;
