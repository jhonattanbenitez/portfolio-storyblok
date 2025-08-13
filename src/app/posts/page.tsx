"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchStories } from "../../../utils/fetchStories";
import Link from "next/link";
import { Story } from "../../../utils/types";
import Image from "next/image";
import NavBar from "../../../components/NavBar";
import formatDate from "../../../utils/formatDate";
import { useTranslation } from "../../../hooks/useTranslation";
import { usePathname } from "next/navigation";

export default function PostsPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const pathname = usePathname();

  // Determine language from URL
  const urlLang = (() => {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first === "es-co" || first === "es") return "es-co";
    return "en";
  })();

  useEffect(() => {
    async function getStories() {
      setIsLoading(true);
      const storiesData = await fetchStories({ 
        version: "published", 
        language: urlLang as "en" | "es-co"
      });
      if (storiesData) {
        setStories(storiesData.stories);
      }
      setIsLoading(false);
    }

    getStories();
  }, [urlLang]);

  if (isLoading) {
    return <p className="text-center text-gray-900">Loading...</p>;
  }

  if (!stories.length) {
    return <p className="text-red-500 text-center">No posts found</p>;
  }

  return (
    <Suspense fallback={<p className="text-center text-gray-900">Loading...</p>}>
      <section className="max-w-full">
        {/* Header Section */}
        <NavBar />
        <div className="bg-gray-900 w-full flex justify-center  py-32 mb-8 sm:py-48 lg:py-16">
          <div className="relative w-full max-w-6xl lg:h-[50vh] flex items-center justify-center">
            <h1 className="text-7xl font-bold text-white uppercase text-center">
              {t("nav.blog")}
            </h1>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="container mx-auto p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="p-4 rounded-sm shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-100 hover:bg-gray-900 group flex flex-col h-full"
              >
                <Link
                  href={`/posts/${story.slug}`}
                  className="flex flex-col flex-grow"
                >
                  {/* Image */}
                  <div className="relative w-full mb-4 flex-shrink-0">
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
                        className="object-cover rounded-sm"
                      />
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-semibold mb-2 uppercase group-hover:text-white">
                    {story.content.title}
                  </h2>

                  {/* Intro */}
                  <p className="text-gray-900 text-sm mb-2 leading-5 group-hover:text-gray-200">
                    {story.content.intro}
                  </p>

                  {/* Spacer to push date to bottom */}
                  <div className="flex-grow"></div>

                  {/* Date */}
                  <div className="flex justify-end">
                    <p className="text-gray-900 text-xs group-hover:text-gray-300">
                      {formatDate(story.content.date)}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Suspense>
  );
}
