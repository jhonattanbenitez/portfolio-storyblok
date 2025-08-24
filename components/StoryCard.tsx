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

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  index,
  urlPrefix,
}) => {
  const { html: introHtml } = useMarkdown(story.content.intro);
  return (
    <div className="p-4 rounded-sm shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-100 hover:bg-gray-900 group flex flex-col h-full">
      <Link
        href={`${urlPrefix}/posts/${story.slug}`}
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
        <div
          className="text-gray-900 text-sm mb-2 leading-5 group-hover:text-gray-200"
          dangerouslySetInnerHTML={{
            __html: introHtml || story.content.intro,
          }}
        />

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
  );
};

export default StoryCard;
