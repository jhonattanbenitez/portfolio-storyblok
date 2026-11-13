import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PREVIEW_SESSION_COOKIE = "storyblok-preview-session";
export const PREVIEW_SESSION_SECONDS = 3600;

export const SENSITIVE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
};

/** Prefer headers for automated callers; keep query entry for existing editor links. */
export function getRequestSecret(request: Pick<Request, "headers" | "url">): string | null {
  const authorization = request.headers.get("authorization");
  // Presence is authoritative: an invalid header must never fall back to a URL secret.
  if (authorization !== null) {
    return /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] ?? null;
  }
  const secrets = new URL(request.url).searchParams.getAll("secret");
  return secrets.length === 1 ? secrets[0] : null;
}

export function createPreviewSession(
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): string {
  if (!env.STORYBLOK_DRAFT_SECRET) throw new Error("Preview authorization is not configured");
  const expires = Math.floor(now / 1000) + PREVIEW_SESSION_SECONDS;
  const payload = `v1.${expires}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", env.STORYBLOK_DRAFT_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isPreviewSessionAuthorized(
  value: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): boolean {
  if (!value || !env.STORYBLOK_DRAFT_SECRET) return false;
  const match = /^(v1\.(\d{10,12})\.[a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[2]);
  const current = Math.floor(now / 1000);
  if (expires <= current || expires > current + PREVIEW_SESSION_SECONDS) return false;
  const expected = createHmac("sha256", env.STORYBLOK_DRAFT_SECRET).update(match[1]).digest("base64url");
  return isAuthorizedSecret(match[3], expected);
}

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

/** Accept a page path, never a URL, query string, or normalized traversal. */
export function getInternalPreviewPath(slug: string | null): string | null {
  if (!slug || slug.length > 2048) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }

  const pathname = decoded.startsWith("/") ? decoded : `/${decoded}`;
  if (pathname === "/") return pathname;
  if (pathname.includes("//")) return null;

  const segments = pathname.slice(1).split("/");
  if (segments.at(-1) === "") segments.pop();
  if (segments.some((segment) =>
    segment === "." || segment === ".." || !/^[\p{L}\p{N}_~.-]+$/u.test(segment)
  )) return null;
  if (/^(?:api|_next|\.git|\.env)(?:$|\.)/.test(segments[0])) return null;

  return pathname;
}

export function isRevalidationRequestAuthorized(
  provided: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isAuthorizedSecret(provided, env.STORYBLOK_REVALIDATION_SECRET);
}
