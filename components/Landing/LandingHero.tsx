"use client";

import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import { TypeAnimation } from "react-type-animation";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

interface TypingWord extends SbBlokData {
  item: string;
}

interface LandingHeroProps {
  blok: SbBlokData & {
    headline: string;
    subheadline_prefix: string;
    typing_words: TypingWord[]; // Expecting nested blocks
    cta_text: string;
    cta_link: { cached_url: string };
    background_image?: { filename: string; alt?: string };
  };
}

const LandingHero = ({ blok }: LandingHeroProps) => {
  const sequence = blok.typing_words
    ? blok.typing_words.flatMap((word) => [word.item, 2000])
    : ["Logistics", 2000, "Inventory", 2000, "Sales", 2000, "Workflows", 2000];

  return (
    <section
      {...storyblokEditable(blok)}
      className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Background Gradient / Image */}
      <div className="absolute inset-0 z-0">
        {blok.background_image?.filename && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${blok.background_image.filename})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
      </div>

      <div className="container relative z-10 px-4 mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            {blok.headline || "Custom Business Software Solutions"}
          </h1>

          <div className="text-2xl md:text-4xl font-light text-muted-foreground h-20 md:h-24">
            <span className="mr-2">
              {blok.subheadline_prefix || "We automate"}
            </span>
            <span className="font-semibold text-primary">
              <TypeAnimation
                sequence={sequence}
                wrapper="span"
                speed={50}
                repeat={Infinity}
                cursor={true}
              />
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link
              href={blok.cta_link?.cached_url || "/contact"}
              className={clsx(
                "inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full",
                "bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300",
                "shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              {blok.cta_text || "Start Automating"}
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Glassmorphism Decorative Elements */}
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute top-20 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
    </section>
  );
};

export default LandingHero;
