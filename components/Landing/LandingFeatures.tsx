"use client";

import {
  storyblokEditable,
  SbBlokData,
  StoryblokServerComponent,
} from "@storyblok/react/rsc";

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
      className="relative overflow-hidden bg-background py-16 md:py-24"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            {blok.title || "Operational Efficiency"}
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
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
