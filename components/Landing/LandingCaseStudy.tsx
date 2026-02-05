"use client";

import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

interface Stat extends SbBlokData {
  value: string;
  label: string;
}

interface LandingCaseStudyProps {
  blok: SbBlokData & {
    title: string;
    description: string;
    image?: { filename: string; alt?: string };
    stats?: Stat[];
    cta_text: string;
    cta_link: { cached_url: string };
  };
}

const LandingCaseStudy = ({ blok }: LandingCaseStudyProps) => {
  return (
    <section
      {...storyblokEditable(blok)}
      className="py-24 bg-gray-50 dark:bg-gray-900/50"
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1 relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] border border-border">
              {blok.image?.filename ? (
                <Image
                  src={blok.image.filename}
                  alt={blok.image.alt || blok.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                  Case Study Image
                </div>
              )}
            </div>
            {/* Floating Card Example */}
            <div className="absolute -bottom-6 -right-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-border hidden md:block max-w-xs">
              <p className="font-bold text-2xl text-blue-600 mb-1">
                95% Faster
              </p>
              <p className="text-sm text-muted-foreground">
                Reduction in order closing time
              </p>
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2 space-y-8"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
              Success Story
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              {blok.title || "Logistics Management System"}
            </h2>

            <p className="text-xl text-muted-foreground leading-relaxed">
              {blok.description ||
                "How we transformed a chaotic manual delivery process into a streamlined digital workflow, reducing daily closing times from 40 minutes to just 2 minutes."}
            </p>

            <div className="grid grid-cols-2 gap-8 border-t border-border pt-8">
              {blok.stats?.map((stat) => (
                <div key={stat._uid}>
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              )) || (
                // Default stats if none provided
                <>
                  <div>
                    <p className="text-3xl font-bold text-foreground mb-1">
                      40m → 2m
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Daily Closing Time
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground mb-1">
                      100%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Paperless Operations
                    </p>
                  </div>
                </>
              )}
            </div>

            <Link
              href={
                blok.cta_link?.cached_url || "/case-studies/logistics-system"
              }
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition"
            >
              {blok.cta_text || "Read Full Case Study"}
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingCaseStudy;
