"use client";

import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();
  return (
    <section
      {...storyblokEditable(blok)}
      className="bg-muted py-16 md:py-24"
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image Side */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
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
            <div className="absolute -bottom-6 -right-6 hidden max-w-xs rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl md:block">
              <p className="mb-1 text-2xl font-bold text-primary">
                95% Faster
              </p>
              <p className="text-sm text-muted-foreground">
                Reduction in order closing time
              </p>
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="order-1 lg:order-2 space-y-8"
          >
            <div className="inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
              Success Story
            </div>

            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              {blok.title || "Logistics Management System"}
            </h2>

            <p className="text-lg leading-relaxed text-muted-foreground">
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
              className="inline-flex items-center font-semibold text-primary transition-colors duration-200 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
