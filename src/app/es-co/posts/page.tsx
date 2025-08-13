"use client";

import { useEffect, useState } from "react";
import { fetchStories } from "../../../../utils/fetchStories";
import Link from "next/link";
import { Story } from "../../../../utils/types";
import Image from "next/image";
import NavBar from "../../../../components/NavBar";
import formatDate from "../../../../utils/formatDate";
import { useTranslation } from "../../../../hooks/useTranslation";

export default function PostsPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function getStories() {
      setIsLoading(true);
      const storiesData = await fetchStories({ 
        version: "published", 
        language: "es-co"
      });
      if (storiesData) {
        setStories(storiesData.stories);
      }
      setIsLoading(false);
    }

    getStories();
  }, []);

  if (isLoading) {
    return <p className="text-center text-gray-900">Cargando...</p>;
  }

  if (!stories.length) {
    return <p className="text-red-500 text-center">No se encontraron publicaciones</p>;
  }

  return (
    <section className="max-w-full">
      <NavBar />
      <div className="bg-gray-900 w-full flex justify-center  py-32 mb-8 sm:py-48 lg:py-16">
        <div className="relative w-full max-w-6xl lg:h-[50vh] flex items-center justify-center">
          <h1 className="text-7xl font-bold text-white uppercase text-center">
            {t("nav.blog")}
          </h1>
        </div>
      </div>
      <div className="container mx-auto p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="p-4 rounded-sm shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-100 hover:bg-gray-900 group flex flex-col h-full"
            >
              <Link
                href={`/es-co/posts/${story.slug}`}
                className="flex flex-col flex-grow"
              >
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
                <h2 className="text-xl font-semibold mb-2 uppercase group-hover:text-white">
                  {story.content.title}
                </h2>
                <p className="text-gray-900 text-sm mb-2 leading-5 group-hover:text-gray-200">
                  {story.content.intro}
                </p>
                <div className="flex-grow"></div>
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
  );
}