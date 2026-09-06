export function getCaseStudyHref(fullSlug: string): string {
  return fullSlug.startsWith("/") ? fullSlug : `/${fullSlug}`;
}
