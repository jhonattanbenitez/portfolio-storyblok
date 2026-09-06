"use client";

import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import Image from "next/image";
import { motion } from "framer-motion";
import clsx from "clsx";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface LandingFeatureProps {
  blok: SbBlokData & {
    title: string;
    description: string;
    image?: { filename: string; alt?: string };
    layout: "logistics" | "inventory" | "dashboard"; // aligned with user request
    benefits?: Array<
      SbBlokData & {
        text?: string;
        name?: string;
      }
    >;
  };
}

const LandingFeature = ({ blok }: LandingFeatureProps) => {
  const isReversed = blok.layout === "inventory";
  const isFullWidth = blok.layout === "dashboard";

  return (
    <motion.div
      {...storyblokEditable(blok)}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className={clsx(
        "flex flex-col gap-12 items-center",
        isFullWidth ? "text-center" : "lg:flex-row",
        isReversed && "lg:flex-row-reverse",
      )}
    >
      {/* Content Side */}
      <div
        className={clsx(
          "flex-1 space-y-6",
          isFullWidth && "max-w-3xl mx-auto mb-8",
        )}
      >
        <div className="inline-block p-3 rounded-2xl bg-blue-500/10 text-blue-500 mb-2">
          {/* Icon based on layout could go here */}
          <span className="text-sm font-semibold uppercase tracking-wider">
            {blok.layout || "Feature"}
          </span>
        </div>
        <h3 className="text-3xl md:text-4xl font-bold text-foreground">
          {blok.title}
        </h3>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {blok.description}
        </p>

        {blok.benefits && (
          <ul
            className={clsx(
              "space-y-3 pt-4",
              isFullWidth && "text-left grid md:grid-cols-2 gap-4 space-y-0",
            )}
          >
            {blok.benefits.map((benefit) => (
              <li key={benefit._uid} className="flex items-start">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-foreground/80">
                  {benefit.text || benefit.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Visual Side */}
      <div className={clsx("flex-1 w-full", isFullWidth && "w-full mt-8")}>
        <div
          className={clsx(
            "relative rounded-2xl overflow-hidden shadow-2xl border border-border/50",
            "bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl",
            isFullWidth ? "aspect-[16/9]" : "aspect-[4/3]",
          )}
        >
          {blok.image?.filename ? (
            <Image
              src={blok.image.filename}
              alt={blok.image.alt || blok.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-secondary/30">
              <span className="text-sm">Image Placeholder: {blok.layout}</span>
            </div>
          )}

          {/* Decorative Glare */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        </div>
      </div>
    </motion.div>
  );
};

export default LandingFeature;
