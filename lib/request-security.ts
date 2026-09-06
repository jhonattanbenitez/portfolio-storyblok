import { timingSafeEqual } from "node:crypto";

export function isAuthorizedSecret(
  provided: string | null,
  expected: string | undefined,
): boolean {
  if (!provided || !expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function isDraftRequestAuthorized(
  provided: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isAuthorizedSecret(provided, env.STORYBLOK_DRAFT_SECRET);
}

export function isRevalidationRequestAuthorized(
  provided: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isAuthorizedSecret(provided, env.STORYBLOK_REVALIDATION_SECRET);
}
