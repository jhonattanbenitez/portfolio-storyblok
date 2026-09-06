import type { Story, SupportedLanguage } from "./types";

type FetchAlternate = (
  fullSlug: string,
  locale: SupportedLanguage,
  version: "draft" | "published",
) => Promise<Story | null>;

type ResolveCaseStudyStoriesOptions = {
  stories: Story[];
  locale: SupportedLanguage;
  version: "draft" | "published";
  fetchAlternate: FetchAlternate;
  onWarning?: (message: string) => void;
};

/**
 * The default case-studies/home relation stores the English group member.
 * While the application supports exactly en and es-co, the single validated
 * Storyblok alternate is the Spanish counterpart. Revisit this invariant
 * before adding another locale.
 */
export async function resolveCaseStudyStoriesForLocale({
  stories,
  locale,
  version,
  fetchAlternate,
  onWarning = console.warn,
}: ResolveCaseStudyStoriesOptions): Promise<Story[]> {
  if (locale === "en") return stories;

  const localizedStories = await Promise.all(
    stories.map(async (story): Promise<Story | null> => {
      if (story.alternates.length !== 1) {
        onWarning(
          `Cannot localize case study ${story.uuid}: expected one alternate, found ${story.alternates.length}.`,
        );
        return null;
      }

      const [alternateReference] = story.alternates;

      if (!alternateReference.published) {
        onWarning(`Cannot localize case study ${story.uuid}: alternate is unpublished.`);
        return null;
      }

      try {
        const alternate = await fetchAlternate(
          alternateReference.full_slug,
          locale,
          version,
        );

        if (!alternate) {
          onWarning(`Cannot localize case study ${story.uuid}: alternate was not found.`);
          return null;
        }

        if (alternate.id !== alternateReference.id) {
          onWarning(`Cannot localize case study ${story.uuid}: alternate ID did not match.`);
          return null;
        }

        if (alternate.group_id !== story.group_id) {
          onWarning(`Cannot localize case study ${story.uuid}: group_id did not match.`);
          return null;
        }

        if (!alternate.alternates.some((candidate) => candidate.id === story.id)) {
          onWarning(`Cannot localize case study ${story.uuid}: alternate link was not mutual.`);
          return null;
        }

        return alternate;
      } catch (error) {
        onWarning(
          `Cannot localize case study ${story.uuid}: ${error instanceof Error ? error.message : "alternate fetch failed"}.`,
        );
        return null;
      }
    }),
  );

  return localizedStories.filter((story): story is Story => story !== null);
}

export function getCaseStudyHref(fullSlug: string): string {
  return fullSlug.startsWith("/") ? fullSlug : `/${fullSlug}`;
}
