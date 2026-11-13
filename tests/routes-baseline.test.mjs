import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import nextConfig from "../next.config.ts";

test("the existing App Router page and handler inventory is preserved", async () => {
  const inventory = JSON.parse(await readFile(new URL("./fixtures/routes.json", import.meta.url), "utf8"));
  const files = await readdir(new URL("../src/app", import.meta.url), { recursive: true });
  assert.deepEqual(files.filter((file) => file.endsWith("page.tsx")).sort(), inventory.appPages);
  assert.deepEqual(files.filter((file) => file.endsWith("route.ts")).sort(), inventory.handlers);
  for (const route of inventory.metadataRoutes) assert.ok(files.includes(route));
  assert.deepEqual(await nextConfig.redirects(), [{ source: "/home", destination: "/", permanent: true }]);
});

test("security headers override preview caching without changing the contact header rule", async () => {
  const headers = await nextConfig.headers();
  const draft = headers.find(({ source }) => source === "/api/draft");
  const preview = headers.find(({ source }) => source === "/live-preview/:path*");
  for (const rule of [draft, preview]) {
    assert.match(rule.headers.find(({ key }) => key === "Cache-Control").value, /no-store/);
    assert.match(rule.headers.find(({ key }) => key === "X-Robots-Tag").value, /noindex/);
  }
});

test("production CSP excludes unsafe-eval while development retains its explicit allowance", async () => {
  const previous = process.env.NODE_ENV;
  try {
    for (const mode of ["production", "development"]) {
      process.env.NODE_ENV = mode;
      const rules = await nextConfig.headers();
      const policy = rules.find(({ source }) => source === "/(.*)").headers.find(({ key }) => key === "Content-Security-Policy").value;
      assert.equal(policy.includes("'unsafe-eval'"), mode === "development");
      assert.ok(policy.includes("frame-ancestors 'self' https://app.storyblok.com"));
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("all API defaults and sensitive preview/revalidation rules prohibit shared caching", async () => {
  const rules = await nextConfig.headers();
  for (const source of ["/api/(.*)", "/api/draft", "/api/revalidate", "/live-preview/:path*"]) {
    const rule = rules.find((item) => item.source === source);
    assert.ok(rule, source);
    const cache = rule.headers.find(({ key }) => key === "Cache-Control").value;
    assert.match(cache, /private/);
    assert.match(cache, /no-store/);
    assert.doesNotMatch(cache, /(?:^|,)\s*public\b|s-maxage/);
  }
});
