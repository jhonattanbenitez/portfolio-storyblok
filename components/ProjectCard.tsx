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
    <div className="group mb-4 flex h-full flex-col overflow-hidden rounded-sm border border-border bg-card text-card-foreground transition-colors duration-200 hover:border-primary/40 hover:shadow-sm">
      {/* Image + overlay */}
      <div className="relative h-52 overflow-hidden border-b border-border md:h-72">
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
      opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100
      bg-transparent md:[background:var(--overlay,rgba(0,0,0,0.60))]
      text-foreground
    "
        >
          {gitUrl && (
            <Link
              href={gitUrl}
              className="
          grid place-items-center h-14 w-14 mr-2 rounded-full
          border border-foreground/60 hover:border-foreground dark:border-white/60 dark:hover:border-white
          text-inherit hover:text-foreground dark:text-white dark:hover:text-white
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
          border border-foreground/60 hover:border-foreground dark:border-white/60 dark:hover:border-white
          text-inherit hover:text-foreground dark:text-white dark:hover:text-white
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
        "
      >
        <h3 className="font-semibold text-xl mb-3">{title}</h3>
        <p className="text-muted-foreground flex-grow">{description}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
