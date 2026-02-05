"use client";

import {
  storyblokEditable,
  SbBlokData,
  StoryblokServerComponent,
} from "@storyblok/react/rsc";
import clsx from "clsx";

interface LandingFeaturesProps {
  blok: SbBlokData & {
    title: string;
    subtitle: string;
    features: SbBlokData[];
  };
}

const LandingFeatures = ({ blok }: LandingFeaturesProps) => {
  return (
    <section
      {...storyblokEditable(blok)}
      className="py-24 bg-background relative overflow-hidden"
    >
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            {blok.title || "Operational Efficiency"}
          </h2>
          <p className="text-xl text-muted-foreground">
            {blok.subtitle ||
              "Transform manual chaos into digital order with our specialized solutions."}
          </p>
        </div>

        <div className="space-y-24">
          {blok.features?.map((nestedBlok) => (
            <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
