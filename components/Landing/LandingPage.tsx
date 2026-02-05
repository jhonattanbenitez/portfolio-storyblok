import {
  SbBlokData,
  storyblokEditable,
  StoryblokServerComponent,
} from "@storyblok/react/rsc";
import React from "react";

interface LandingPageProps {
  blok: SbBlokData & {
    body: SbBlokData[];
  };
}

const LandingPage = ({ blok }: LandingPageProps) => {
  return (
    <main
      {...storyblokEditable(blok)}
      className="w-full overflow-x-hidden bg-background"
    >
      {blok.body?.map((nestedBlok) => (
        <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
      ))}
    </main>
  );
};

export default LandingPage;
