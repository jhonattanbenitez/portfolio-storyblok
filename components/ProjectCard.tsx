"use client";
import React from "react";
import { CodeBracketIcon, EyeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";

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
      {/* Image + overlay */}
      <div className="relative h-52 md:h-72 rounded-t-xl overflow-hidden group">
        <Image
          src={imgUrl || "/default-project.png"}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
        />

        <div
          className="
      absolute inset-0 flex items-center justify-center
      opacity-0 group-hover:opacity-100 transition-opacity duration-300
      [background:var(--overlay,rgba(0,0,0,0.60))]
      text-foreground
    "
          aria-hidden="true"
        >
          {gitUrl && (
            <Link
              href={gitUrl}
              className="
          grid place-items-center h-14 w-14 mr-2 rounded-full
          border border-foreground/60 hover:border-foreground
          text-inherit hover:text-foreground
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          transition
        "
              aria-label="View source code"
              target={/^https?:\/\//i.test(gitUrl) ? "_blank" : undefined}
              rel={
                /^https?:\/\//i.test(gitUrl) ? "noopener noreferrer" : undefined
              }
            >
              <CodeBracketIcon className="h-8 w-8" />
            </Link>
          )}

          {previewUrl && (
            <Link
              href={previewUrl}
              className="
          grid place-items-center h-14 w-14 rounded-full
          border border-foreground/60 hover:border-foreground
          text-inherit hover:text-foreground
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          transition
        "
              aria-label="Open live preview"
              target={/^https?:\/\//i.test(previewUrl) ? "_blank" : undefined}
              rel={
                /^https?:\/\//i.test(previewUrl)
                  ? "noopener noreferrer"
                  : undefined
              }
            >
              <EyeIcon className="h-8 w-8" />
            </Link>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        className="
          flex-grow flex flex-col p-5
          rounded-b-xl border bg-card text-card-foreground border-border
        "
      >
        <h5 className="font-semibold text-xl mb-3">{title}</h5>
        <p className="text-muted-foreground flex-grow">{description}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
