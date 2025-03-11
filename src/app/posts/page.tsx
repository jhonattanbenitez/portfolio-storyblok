"use client";

import { useEffect, useState } from "react";
import { fetchStories } from "../../../utils/fetchStories";
import Link from "next/link";
import { Story } from "../../../utils/types";
import Image from "next/image";

export default function PostsPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getStories() {
      setIsLoading(true);
      const storiesData = await fetchStories("published");
      if (storiesData) {
        setStories(storiesData.stories);
      }
      setIsLoading(false);
    }

    getStories();
  }, []);

  if (isLoading) {
    return <p className="text-center text-gray-600">Loading...</p>;
  }

  if (!stories.length) {
    return <p className="text-red-500 text-center">No posts found</p>;
  }

  return (
    <section className="max-w-full">
      {/* Header Section */}
      <div className="bg-gray-900 w-full flex justify-center  py-8 mb-8">
        <div className="relative w-full max-w-6xl lg:h-[50vh] flex items-center justify-center">
          <h1 className="text-7xl font-bold text-white uppercase text-center">
            Blog
          </h1>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="container mx-auto p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="border p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-900 group"
            >
              <Link href={`/posts/${story.slug}`} className="block">
                {/* Image */}
                <div className="relative h-48 w-full mb-4">
                  {story.content.image?.[0]?.filename && (
                    <Image
                      src={story.content.image[0].filename}
                      alt={story.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  )}
                </div>

                {/* Title */}
                <h2 className="text-1xl font-semibold mb-2 uppercase group-hover:text-white">
                  {story.name}
                </h2>

                {/* Intro */}
                <p className="text-gray-600 text-sm leading-5 group-hover:text-gray-200">
                  {story.content.intro}
                </p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
