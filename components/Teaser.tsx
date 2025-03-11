import { SbBlokData, storyblokEditable } from "@storyblok/react/rsc";
import Link from "next/link";
import React from "react";

interface SbTeaserData extends SbBlokData {
  headline: string;
}

interface TeaserProps {
  blok: SbTeaserData;
}

const Teaser: React.FunctionComponent<TeaserProps> = ({ blok }) => {
  return (
    <section
      {...storyblokEditable(blok)}
      className="flex justify-center items-center min-h-screen"
    >
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
              {blok.headline}
            </h1>
            <h2 className="fixed right-4 bottom-2 text-2xl sm:text-4xl">
              <span className="text-xl sm:text-2xl">by </span>
              <Link href="https://focusreactive.com" className="underline">
                FocusReactive
              </Link>
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Teaser;
