import assert from "node:assert/strict";
import test from "node:test";

import {
  isDraftRequestAuthorized,
  isRevalidationRequestAuthorized,
} from "../lib/request-security.ts";
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
