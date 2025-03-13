import React from "react";
import { CodeBracketIcon, EyeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type ProjectCardProps = {
  imgUrl: string;
  title: string;
  description: string;
  gitUrl?: string;
  previewUrl?: string;
};

const ProjectCard = ({
  imgUrl,
  title,
  description,
  gitUrl,
  previewUrl,
}: ProjectCardProps) => {
  return (
    <div className="mb-4 h-full flex flex-col">
      <div
        className="h-52 md:h-72 rounded-t-xl relative group"
        style={{ background: `url(${imgUrl})`, backgroundSize: "cover" }}
      >
        <div className="overlay items-center justify-center absolute top-0 left-0 w-full h-full bg-[#1818188d] hidden group-hover:flex group-hover:bg-opacity-50 transition-all duration-300">
          {gitUrl && (
            <Link
              href={gitUrl}
              className="h-14 w-14 border-2 relative mr-2 rounded-full border-[#ADB7BE] hover:border-white group/link"
            >
              <CodeBracketIcon className="h-10 w-10 text-[#ADB7BE] group-hover/link:text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" />
            </Link>
          )}
          {previewUrl && (
            <Link
              href={previewUrl}
              className="h-14 w-14 border-2 relative rounded-full border-[#ADB7BE] hover:border-white group/link"
            >
              <EyeIcon className="h-10 w-10 text-[#ADB7BE] group-hover/link:text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" />
            </Link>
          )}
        </div>
      </div>
      <div className="text-white rounded-b-xl bg-[#181818] p-5 flex-grow flex flex-col">
        <h5 className="font-xl font-semibold mb-3">{title}</h5>
        <p className="text-[#ADB7BE] flex-grow">{description}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
