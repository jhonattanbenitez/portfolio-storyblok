
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SbBlokData, storyblokEditable } from "@storyblok/react";

type ImageType = {
  filename: string;
};

interface SBHeroData extends SbBlokData {
  Name: string;
  profile?: ImageType[];
}

interface HeroProps {
  blok: SBHeroData;
}

const Hero: React.FunctionComponent<HeroProps> = ({ blok }) => {
  return (
    <section
      {...storyblokEditable(blok)}
      className="lg:py-16 flex justify-center"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12">
        <div className="col-span-8 place-self-center text-center sm:text-left justify-self-start">
          <div className="col-span-8 place-self-center text-center sm:text-left justify-self-start">
            <h1 className="text-white mb-4 text-4xl sm:text-5xl lg:text-8xl lg:leading-normal font-extrabold">
              {blok.Name}
            </h1>
          </div>
        </div>

        <div className="col-span-4 place-self-center mt-5 lg:mt-0">
          <div className="rounded-full bg-[#181818] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] relative">
            <Image
              src={blok.profile[0].filename}
              alt="hero image"
              width={240}
              height={240}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
