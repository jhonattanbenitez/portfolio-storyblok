"use client";
import React from "react";
import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import CaseStudyCard from "./CaseStudyCard";

interface CaseStudyStory {
  uuid: string;
  name: string;
  full_slug: string;
  content: {
    title?: string;
    intro?: string;
    image?: {
      filename: string;
    };
    client?: string;
    services?: string;
    color?: string;
  };
}

interface CaseStudiesSectionProps {
  blok: SbBlokData & {
    title: string;
    description: string;
    case_studies: CaseStudyStory[]; // Expecting resolved stories
  };
}

const CaseStudiesSection: React.FC<CaseStudiesSectionProps> = ({ blok }) => {
  return (
    <section
      {...storyblokEditable(blok)}
      id="case-studies"
      className="py-16 md:py-24 bg-background"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          {blok.title && (
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              {blok.title}
            </h2>
          )}
          {blok.description && (
            <p className="text-lg text-muted-foreground">{blok.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blok.case_studies && Array.isArray(blok.case_studies) ? (
            blok.case_studies.map((story) => {
              // Check if story is an object (resolved) or just a UUID string
              if (typeof story !== "object" || !story.content) {
                return null; // Skip unresolved or invalid items
              }

              return (
                <div key={story.uuid} className="h-full">
                  <CaseStudyCard
                    title={story.content.title || story.name}
                    intro={story.content.intro || ""}
                    image={story.content.image?.filename || ""}
                    slug={story.full_slug}
                    client={story.content.client}
                    services={story.content.services}
                    color={story.content.color}
                  />
                </div>
              );
            })
          ) : (
            <p className="text-center w-full text-muted-foreground col-span-full">
              No case studies found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CaseStudiesSection;
