"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

interface CaseStudyCardProps {
  title: string;
  intro: string;
  image: string;
  slug: string;
  client?: string;
  services?: string;
  color?: string;
}

const CaseStudyCard: React.FC<CaseStudyCardProps> = ({
  title,
  intro,
  image,
  slug,
  client,
  services,
}) => {
  return (
    <Link href={`/${slug}`} className="group block h-full">
      <div className="h-full flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative h-64 w-full overflow-hidden">
          <Image
            src={image || "/default-project.png"}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 768px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

          {/* Overlay Info */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            {client && (
              <p className="text-xs font-medium uppercase tracking-wider mb-1 opacity-90">
                {client}
              </p>
            )}
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-grow">
          {services && (
            <div className="mb-3">
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground">
                {services}
              </span>
            </div>
          )}

          <p className="text-muted-foreground mb-6 line-clamp-3 text-sm flex-grow">
            {intro}
          </p>

          <div className="mt-auto flex items-center text-primary font-medium group-hover:text-primary/80 transition-colors">
            <span>Read Case Study</span>
            <ArrowRightIcon className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CaseStudyCard;
