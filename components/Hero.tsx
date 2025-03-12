
"use client";
import React from "react";
import Image from "next/image";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import TextAnimation from "./TextAnimation";

type ImageType = {
  filename: string;
};

interface SBHeroData extends SbBlokData {
  list: { item: string; _uid: string; component: string }[];
  profile?: ImageType[];
}

interface HeroProps {
  blok: SBHeroData;
}

const Hero: React.FunctionComponent<HeroProps> = ({ blok }) => {
    const blokList = blok.list
    blokList.forEach(item => console.log(item.item))
    return (
      <section
        {...storyblokEditable(blok)}
        className="lg:py-16 flex justify-center bg-gray-900 pt-[128px]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12">
          <div className="col-span-8 place-self-center text-center sm:text-left justify-self-start">
            <div className="col-span-8 place-self-center text-center sm:text-left justify-self-start">
              <h1 className="text-white mb-4 text-4xl sm:text-5xl lg:text-6xl lg:leading-normal font-extrabold">
                <span className="bg-clip-text text-white bg-gradient-to-r from-primary-400 to-secondary-600">
                  Hello, I&apos;m{" "}
                </span>
                <br />
                <TextAnimation list={blok.list}/>
              </h1>
            </div>
          </div>

          <div className="col-span-4 place-self-center mt-5 lg:mt-0">
            <div className="rounded-full bg-[#181818] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] relative">
              <Image
                src={blok.profile?.[0]?.filename ?? '/default-profile.jpg'}
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
