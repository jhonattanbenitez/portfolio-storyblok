import assert from "node:assert/strict";
import test from "node:test";

import {
  isDraftRequestAuthorized,
  isRevalidationRequestAuthorized,
  getInternalPreviewPath,
  createPreviewSession,
  isPreviewSessionAuthorized,
  PREVIEW_SESSION_SECONDS,
} from "../lib/request-security.ts";

test("signed preview sessions expire and require the dedicated private secret", () => {
  const env = { STORYBLOK_DRAFT_SECRET: "synthetic-session-secret" };
  const now = Date.UTC(2026, 10, 12);
  const value = createPreviewSession(env, now);
  assert.equal(isPreviewSessionAuthorized(value, env, now), true);
  assert.equal(isPreviewSessionAuthorized(value, env, now + (PREVIEW_SESSION_SECONDS - 1) * 1000), true);
  assert.equal(isPreviewSessionAuthorized(value, env, now + PREVIEW_SESSION_SECONDS * 1000), false);
  assert.equal(isPreviewSessionAuthorized(value, {}, now), false);
  assert.throws(() => createPreviewSession({}, now));
});

test("modified sessions and sessions signed with another or rotated secret are rejected", () => {
  const env = { STORYBLOK_DRAFT_SECRET: "synthetic-session-secret" };
  const now = Date.UTC(2026, 10, 12);
  const value = createPreviewSession(env, now);
  assert.equal(isPreviewSessionAuthorized(value, { STORYBLOK_DRAFT_SECRET: "another-secret" }, now), false);
  assert.equal(isPreviewSessionAuthorized(value.replace("v1.", "v2."), env, now), false);
  assert.equal(isPreviewSessionAuthorized(value.slice(0, -1) + "!", env, now), false);
  const parts = value.split(".");
  parts[1] = String(Number(parts[1]) + 1);
  assert.equal(isPreviewSessionAuthorized(parts.join("."), env, now), false);
});

test("malformed and future preview sessions never authorize drafts", () => {
  const env = { STORYBLOK_DRAFT_SECRET: "synthetic-session-secret" };
  const now = Date.UTC(2026, 10, 12);
  for (const value of [undefined, "", "development-id", "forged", "v1.9999999999999999999.nonce.signature"]) {
    assert.equal(isPreviewSessionAuthorized(value, env, now), false);
  }
  assert.equal(isPreviewSessionAuthorized(createPreviewSession(env, now + 3600000), env, now), false);
});

test("preview destinations preserve existing internal localized paths", () => {
  for (const path of ["/", "/posts/example", "/es-co/posts/ejemplo", "/live-preview/es-co/posts/ejemplo", "/case-studies/example/"]) {
    assert.equal(getInternalPreviewPath(path), path);
  }
  assert.equal(getInternalPreviewPath("posts/example"), "/posts/example");
  assert.equal(getInternalPreviewPath("/posts/caf%C3%A9"), "/posts/café");
});

test("preview destinations reject URL, traversal, encoding, and control-character attacks", () => {
  for (const path of [null, "", "//example.invalid", "///example.invalid", "https://example.invalid", "javascript:alert(1)", "/\\example.invalid", "/%5cexample.invalid", "/%2fexample.invalid", "/%252f%252fexample.invalid", "/posts/../api/contact", "/posts/%2e%2e/", "/./", "/posts//example", "/posts/%00", "/posts/%0d%0aLocation:evil", "/posts/%", "/posts/foo?secret=x", "/posts/foo#bar", "/posts/foo%3fbar", "/api/draft", "/_next/static", "/.env.local", "/.git/config", " ", "/" + "a".repeat(2049)]) {
    assert.equal(getInternalPreviewPath(path), null, `Accepted unsafe destination: ${path}`);
  }
});
import {
  getStoryblokVersion,
  isStoryblokNotFound,
  StoryblokDataError,
} from "../lib/storyblok-data.ts";
import {
  invalidateAllCmsCache,
  invalidateStoryCache,
} from "../utils/revalidation.ts";
import {
  renderContactEmailHtml,
  validateContactPayload,
} from "../utils/contact.ts";

test("draft authorization requires its dedicated server secret", () => {
  const env = { STORYBLOK_DRAFT_SECRET: "draft-secret" };
  assert.equal(isDraftRequestAuthorized("draft-secret", env), true);
  assert.equal(isDraftRequestAuthorized("wrong", env), false);
  assert.equal(isDraftRequestAuthorized(null, env), false);
  assert.equal(isDraftRequestAuthorized("draft-secret", {}), false);
});

test("revalidation authorization uses a different dedicated server secret", () => {
  const env = {
    STORYBLOK_DRAFT_SECRET: "draft-secret",
    STORYBLOK_REVALIDATION_SECRET: "revalidation-secret",
    NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN: "public-preview-token",
  };
  assert.equal(isRevalidationRequestAuthorized("revalidation-secret", env), true);
  assert.equal(isRevalidationRequestAuthorized("draft-secret", env), false);
  assert.equal(isRevalidationRequestAuthorized("public-preview-token", env), false);
  assert.equal(isRevalidationRequestAuthorized(null, env), false);
});

test("revalidation helpers propagate invalidation failures", () => {
  const failure = new Error("cache unavailable");
  assert.throws(() => invalidateAllCmsCache(() => { throw failure; }), failure);
  assert.throws(() => invalidateStoryCache("posts/example", () => { throw failure; }), failure);
});

test("only a confirmed Storyblok 404 is classified as not found", () => {
  assert.equal(
    isStoryblokNotFound(new StoryblokDataError("missing", "REQUEST_FAILED", 404)),
    true,
  );
  assert.equal(
    isStoryblokNotFound(new StoryblokDataError("upstream", "REQUEST_FAILED", 500)),
    false,
  );
  assert.equal(
    isStoryblokNotFound(new StoryblokDataError("network", "REQUEST_FAILED")),
    false,
  );
  assert.equal(isStoryblokNotFound(new TypeError("network failed")), false);
});

test("published is the default regardless of local development", () => {
  assert.equal(getStoryblokVersion(false), "published");
});

test("explicit Next draft mode selects draft content", () => {
  assert.equal(getStoryblokVersion(true), "draft");
});

test("malformed contact payloads are rejected before external work", () => {
  assert.equal(validateContactPayload(null).data, undefined);
  assert.equal(validateContactPayload({
    name: { injected: true },
    email: ["person@example.com"],
    message: 123,
    recaptchaToken: true,
  }).data, undefined);
});

test("contact HTML escapes all interpolated user fields", () => {
  const html = renderContactEmailHtml({
    name: "<img src=x onerror=alert(1)>",
    email: "person@example.com<script>",
    message: "Hello & goodbye\n<b>unsafe</b>",
    recaptchaToken: "token",
  });
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<b>unsafe</b>"), false);
  assert.match(html, /&lt;img/);
  assert.match(html, /Hello &amp; goodbye<br>&lt;b&gt;unsafe&lt;\/b&gt;/);
});
