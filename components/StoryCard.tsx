"use client";
import Link from "next/link";
import Image from "next/image";
import { Story } from "../utils/types";
import formatDate from "../utils/formatDate";
import { useMarkdown } from "../hooks/useMarkdown";

interface StoryCardProps {
  story: Story;
  index: number;
  urlPrefix?: string;
}

const StoryCard: React.FC<StoryCardProps> = ({ story, index, urlPrefix }) => {
  const { html: introHtml } = useMarkdown(story.content.intro);

  // normaliza prefijo para evitar // en la URL
  const prefix = (urlPrefix ?? "").replace(/\/$/, "");

  return (
    <div
      className="
        group flex h-full flex-col rounded-sm border border-border
        bg-card text-card-foreground
        shadow-sm transition-all duration-300
        hover:shadow-lg hover:ring-1 hover:ring-ring
      "
    >
      <Link
        href={`${prefix}/posts/${story.slug}`}
        className="flex flex-col flex-grow"
        aria-label={story.content.title}
      >
        <div className="relative w-full mb-4 flex-shrink-0 h-auto">
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
            __html: introHtml || story.content.intro,
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
