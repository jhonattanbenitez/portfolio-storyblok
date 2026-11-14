/**
 * Offline pilot only. This module is deliberately not imported by the site.
 * Publication and field mappings below are caller-supplied evidence, not fields
 * invented on the Storyblok response. They require CMS verification before any
 * production adapter can use this policy.
 */
export function evaluateFieldTranslation(input = {}) {
  const { baseStory, localizedFields, publication } = input ?? {};
  const reject = (reason) => ({ eligible: false, reason });
  if (baseStory?.published !== true) return reject("ARTICLE_UNPUBLISHED");
  if (
    !Number.isSafeInteger(baseStory.id) || baseStory.id <= 0 ||
    publication?.publishedSnapshotConfirmed !== true ||
    publication.snapshotStoryId !== baseStory.id ||
    baseStory.unpublished_changes !== false
  ) return reject("UNVERIFIED_PUBLISHED_SNAPSHOT");
  if (!["joint", "individual"].includes(publication.mode)) {
    return reject("UNKNOWN_PUBLICATION_MODE");
  }
  if (
    publication.localePublished === false ||
    (publication.mode === "individual" && publication.localePublished !== true)
  ) {
    return reject("LOCALE_UNPUBLISHED");
  }

  const content = {};
  let suffix;
  for (const field of ["title", "intro", "content"]) {
    const key = localizedFields?.[field];
    const prefix = `${field}__i18n__`;
    if (typeof key !== "string" || !key.startsWith(prefix)) {
      return reject("INCOMPLETE_TRANSLATION");
    }
    const candidateSuffix = key.slice(prefix.length);
    if (!candidateSuffix || (suffix !== undefined && suffix !== candidateSuffix)) {
      return reject("INCOMPLETE_TRANSLATION");
    }
    suffix = candidateSuffix;
    if (!baseStory.content || !Object.hasOwn(baseStory.content, key)) {
      return reject("INCOMPLETE_TRANSLATION");
    }
    const value = baseStory.content[key];
    if (typeof value !== "string" || !value.trim()) {
      return reject("INCOMPLETE_TRANSLATION");
    }
    content[field] = value;
  }
  return { eligible: true, reason: "READY", content };
}
