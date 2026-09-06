import CaseStudy from "./CaseStudy";
import type { CaseStudyProps } from "./CaseStudy";
import { markdownToHtml } from "../utils/markdown";

type CaseStudyBlok = CaseStudyProps["blok"];

export default async function CaseStudyServer({ blok }: { blok: CaseStudyBlok }) {
  const [contentHtml, introHtml] = await Promise.all([
    markdownToHtml(blok.content),
    markdownToHtml(blok.intro),
  ]);

  return (
    <CaseStudy
      blok={blok}
      contentHtml={contentHtml}
      introHtml={introHtml}
    />
  );
}
