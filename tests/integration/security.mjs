import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { releaseEvidencePaths, verifyReleaseManifest } from "../../scripts/release-validation-manifest.mjs";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
// A realistic-sized image exercises decoding under next/image's srcset contract.
const syntheticImage = await sharp({ create: { width: 800, height: 450, channels: 3, background: { r: 32, g: 64, b: 96 } } }).png().toBuffer();
if (!existsSync(`${root}.next/BUILD_ID`)) throw new Error("Run npm run build before integration tests");
const candidate = await verifyReleaseManifest(root);
const evidence = await releaseEvidencePaths(root);
const fixtureRunId = `${candidate.buildId}-${process.pid}-${Date.now().toString(36)}`;
let imageFixtureDiagnostics = null;
const executablePath = process.env.BROWSER_EXECUTABLE || ["/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
if (!executablePath) throw new Error("Set BROWSER_EXECUTABLE to an installed Chromium browser; none will be downloaded");

const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const origin = `http://localhost:${port}`;
const fixtureSecret = "synthetic-integration-draft-secret";
const revalidationSecret = "synthetic-integration-revalidation-secret";
const checkResults = [];
const startedAt = new Date().toISOString();
let draftFetches = 0;
let completed = 0;
const server = spawn(process.execPath, [`${root}node_modules/next/dist/bin/next`, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env, NODE_ENV: "production", ANALYTICS_ENABLED: "true",
    SITE_URL: "https://www.jhonattan.dev",
    STORYBLOK_TOKEN: `synthetic-integration-published-${fixtureRunId}`,
    STORYBLOK_PREVIEW_TOKEN: `synthetic-integration-preview-${fixtureRunId}`,
    STORYBLOK_DRAFT_SECRET: fixtureSecret, STORYBLOK_REVALIDATION_SECRET: revalidationSecret,
    SECURITY_INTEGRATION_FIXTURES: "1",
    NODE_OPTIONS: `--require=${fileURLToPath(new URL("./server-fixtures.js", import.meta.url))}`,
  },
  // Never echo server logs: real deployments may log content identifiers.
  stdio: ["ignore", "ignore", "ignore", "ipc"],
});
server.on("message", (message) => { if (message.type === "fixture-fetch" && message.version === "draft") draftFetches++; });
let browser;
async function check(name, run) {
  const started = Date.now();
  try {
    await run();
    completed++;
    checkResults.push({ name, status: "passed", durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    // Deliberately omit messages, request URLs, headers, cookies and page bodies.
    checkResults.push({ name, status: "failed", durationMs: Date.now() - started, errorType: /^[A-Za-z]+$/.test(error?.name || "") ? error.name : "Error" });
    throw error;
  }
}
const contexts = [];
async function contextWithNetworkStubs(runtimeOrigin = origin) {
  const context = await browser.newContext();
  contexts.push(context);
  const analyticsRequests = [];
  const imageRequests = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === runtimeOrigin && url.pathname === "/_next/image") {
      imageRequests.push({ expectedFixture: url.searchParams.get("url")?.startsWith("https://a-us.storyblok.com/f/1023389/800x450/synthetic/fixture.png") === true, widthDescriptor: Number(url.searchParams.get("w")) || null });
    }
    if (url.origin === runtimeOrigin && url.pathname === "/_next/image" && url.searchParams.get("url")?.startsWith("https://a-us.storyblok.com/f/1023389/800x450/synthetic/fixture.png")) {
      // Serve the synthetic image in memory; never ask Next's optimizer to fetch it.
      return route.fulfill({ contentType: "image/png", body: syntheticImage });
    }
    if (url.origin === runtimeOrigin) return route.continue();
    if (url.hostname === "www.googletagmanager.com") {
      analyticsRequests.push(url.pathname);
      return route.fulfill({ contentType: "text/javascript", body: "window.__analyticsStubLoaded=true;" });
    }
    if (url.hostname === "app.storyblok.com" && url.pathname.endsWith("storyblok-v2-latest.js")) {
      return route.fulfill({ contentType: "text/javascript", body: 'window.storyblokRegisterEvent=(callback)=>callback(); window.StoryblokBridge=class {on(events,callback){window.__bridgeCallback=callback;}};' });
    }
    return route.abort();
  });
  return { context, analyticsRequests, imageRequests };
}
async function settle(page) {
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).waitFor();
  await delay(150);
}
async function grant(page) {
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.waitForFunction(() => window.__analyticsStubLoaded === true);
}
async function expectPrivate(response) {
  const headers = response.headers();
  assert.match(headers["cache-control"], /no-store/);
  assert.doesNotMatch(headers["cache-control"], /(?:^|,)\s*public\b/);
  assert.match(headers["x-robots-tag"], /noindex/);
  assert.equal(headers["referrer-policy"], "no-referrer");
}

async function withRuntime(overrides, run) {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const runtimePort = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const runtimeOrigin = `http://localhost:${runtimePort}`;
  const runtime = spawn(process.execPath, [`${root}node_modules/next/dist/bin/next`, overrides.NODE_ENV === "development" ? "dev" : "start", "--hostname", "127.0.0.1", "--port", String(runtimePort)], {
    cwd: root,
    env: {
      ...process.env, NODE_ENV: "production", ANALYTICS_ENABLED: "true",
    SITE_URL: "https://www.jhonattan.dev",
      STORYBLOK_TOKEN: `synthetic-integration-published-${fixtureRunId}`, STORYBLOK_PREVIEW_TOKEN: `synthetic-integration-preview-${fixtureRunId}`,
      STORYBLOK_DRAFT_SECRET: fixtureSecret, STORYBLOK_REVALIDATION_SECRET: revalidationSecret, SECURITY_INTEGRATION_FIXTURES: "1",
      NODE_OPTIONS: `--require=${fileURLToPath(new URL("./server-fixtures.js", import.meta.url))}`,
      ...overrides,
    },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (runtime.exitCode !== null) throw new Error("Additional integration runtime exited");
      try { if ((await fetch(`${runtimeOrigin}/contact`)).ok) { ready = true; break; } } catch { /* Local startup. */ }
      await delay(100);
    }
    if (!ready) throw new Error("Additional integration runtime did not become ready");
    await run(runtimeOrigin);
  } finally {
    runtime.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => runtime.once("exit", resolve)), delay(5000)]);
    if (runtime.exitCode === null) runtime.kill("SIGKILL");
  }
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Integration server exited before readiness");
    try { const res = await fetch(`${origin}/contact`); if (res.ok) { ready = true; break; } } catch { /* Wait for local startup. */ }
    await delay(100);
  }
  if (!ready) throw new Error("Integration server did not become ready");
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  await check("baseline public route families and permanent redirects remain available", async () => {
    const manifest = JSON.parse(readFileSync(new URL("../fixtures/routes.json", import.meta.url)));
    for (const path of manifest.publicPaths) {
      const res = await fetch(origin + path);
      assert.equal(res.status, 200, `Public route failed: ${path}`);
    }
    for (const rule of manifest.permanentRedirects) {
      const res = await fetch(origin + rule.from + "?ref=fixture", { redirect: "manual" });
      assert.equal(res.status, rule.status);
      assert.equal(new URL(res.headers.get("location"), origin).pathname, rule.to);
    }
    const missing = await fetch(`${origin}/posts/nonexistent-security-fixture`);
    // Existing streamed notFound responses may already have sent a 200 header.
    assert.ok([200, 404].includes(missing.status));
    assert.match(await missing.text(), /name="robots" content="noindex"/);
    const unsupported = await fetch(`${origin}/api/contact`);
    assert.equal(unsupported.status, 405);
    const privateApi = await fetch(`${origin}/api/revalidate`);
    assert.equal(privateApi.status, 401);
  });

  await check("approved-domain canonical, hreflang, sitemap and robots agree, with plain-text descriptions", async () => {
    const canonical = "https://www.jhonattan.dev";
    const response = await fetch(`${origin}/posts/security-fixture`);
    assert.doesNotMatch(response.headers.get("content-security-policy"), /'unsafe-eval'/);
    const html = await response.text();
    assert.ok(html.includes(`rel="canonical" href="${canonical}/posts/security-fixture"`));
    assert.ok(html.includes(`href="${canonical}/es-co/posts/security-fixture-es"`));
    assert.match(html, /name="description" content="Safe intro"/);
    const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
    // Sitemap is prerendered by the production build, not by runtime fixtures.
    const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
    assert.ok(sitemapUrls.length > 0);
    assert.ok(sitemapUrls.every((url) => url.origin === canonical));
    assert.ok(sitemapUrls.some((url) => url.pathname.startsWith("/es-co/posts/")));
    assert.doesNotMatch(sitemap, /jhonattanbenitez\.dev/);
    const robots = await (await fetch(`${origin}/robots.txt`)).text();
    assert.ok(robots.includes(`Sitemap: ${canonical}/sitemap.xml`));
  });

  await check("category language navigation follows real slugs and wrong-locale aliases cannot be indexed", async () => {
    const { context } = await contextWithNetworkStubs();
    const page = await context.newPage();
    await page.goto(`${origin}/categories/learning`);
    await page.getByRole("button", { name: "Switch to Spanish" }).click();
    await page.waitForURL(`${origin}/es-co/categories/aprendizaje`);
    await page.getByRole("heading", { level: 1, name: /Categoría española/ }).waitFor();
    await page.getByRole("button", { name: "Switch to English" }).click();
    await page.waitForURL(`${origin}/categories/learning`);
    const aliases = [
      ["/es-co/posts/security-fixture", "/es-co/posts/security-fixture-es"],
      ["/posts/security-fixture-es", "/posts/security-fixture"],
      ["/es-co/categories/learning", "/es-co/categories/aprendizaje"],
      ["/categories/aprendizaje", "/categories/learning"],
    ];
    for (const [alias, target] of aliases) {
      const response = await fetch(`${origin}${alias}?ref=fixture`, { redirect: "manual" });
      if (response.status === 308) {
        const destination = new URL(response.headers.get("location"), origin);
        assert.equal(destination.pathname, target);
        assert.equal(destination.searchParams.get("ref"), "fixture");
      } else {
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /name="robots" content="noindex, follow"/);
        assert.ok(html.includes(`rel="canonical" href="https://www.jhonattan.dev${target}"`));
      }
      await page.goto(`${origin}${alias}?ref=fixture`);
      await page.waitForURL(`${origin}${target}?ref=fixture`);
    }
    await context.close();
  });

  await check("sensitive APIs accept bearer/query credentials with exclusive header precedence and private responses", async () => {
    for (const [path, secret, success] of [["/api/draft?slug=/live-preview/posts/security-fixture", fixtureSecret, 307], ["/api/revalidate?tag=cms", revalidationSecret, 200]]) {
      for (const [suffix, headers] of [["", { Authorization: `Bearer ${secret}` }], [`&secret=${secret}`, {}], ["&secret=incorrect", { Authorization: `Bearer ${secret}` }]]) {
        const response = await fetch(`${origin}${path}${suffix}`, { headers, redirect: "manual" });
        assert.equal(response.status, success);
        await expectPrivate({ headers: () => Object.fromEntries(response.headers) });
        assert.equal((response.headers.get("location") || "").includes(secret), false);
      }
      for (const [suffix, headers] of [["", {}], ["&secret=incorrect", {}], [`&secret=${secret}&secret=${secret}`, {}], [`&secret=${secret}`, { Authorization: "Bearer incorrect" }], [`&secret=${secret}`, { Authorization: "Basic incorrect" }]]) {
        const response = await fetch(`${origin}${path}${suffix}`, { headers, redirect: "manual" });
        assert.equal(response.status, 401);
        assert.equal(response.headers.has("set-cookie"), false);
        await expectPrivate({ headers: () => Object.fromEntries(response.headers) });
      }
    }
  });

  await check("field-localized Spanish text and synthetic images preserve the existing rendering contract", async () => {
    const { context, imageRequests } = await contextWithNetworkStubs();
    imageFixtureDiagnostics = { requests: imageRequests };
    const page = await context.newPage();
    await page.goto(`${origin}/es-co/posts/security-fixture-es`);
    await page.getByRole("heading", { level: 1, name: "Artículo sintético localizado", exact: true }).waitFor();
    await page.getByRole("heading", { level: 2, name: "Texto localizado", exact: true }).waitFor();
    assert.equal(await page.locator('meta[name="description"]').getAttribute("content"), "Introducción localizada.");
    assert.equal(await page.locator("article img").getAttribute("alt"), "Cover image for Artículo sintético localizado");
    const image = page.locator("article img");
    const dimensions = (img) => ({ complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, renderedWidth: img.width, renderedHeight: img.height });
    imageFixtureDiagnostics.beforeDecode = await image.evaluate(dimensions);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((img) => img.decode());
    imageFixtureDiagnostics.afterDecode = await image.evaluate(dimensions);
    await page.waitForFunction(() => document.querySelector("article img")?.naturalWidth > 0);
    await context.close();
  });

  await check("malformed decoded story paths fail closed without indexable metadata", async () => {
    for (const path of ["/posts/probe%2Fother", "/posts/probe%252Fother", "/posts/%252e%252e", "/posts/probe%00"]) {
      const response = await fetch(`${origin}${path}`);
      assert.ok([200, 404].includes(response.status));
      assert.match(await response.text(), /name="robots" content="noindex/);
    }
  });

  await check("anonymous and forged draft cookies cannot fetch or render drafts", async () => {
    const before = draftFetches;
    for (const cookie of ["", "__prerender_bypass=forged-cookie"]) {
      const res = await fetch(`${origin}/live-preview/posts/security-fixture`, { headers: { Cookie: cookie } });
      assert.equal(res.status, 404);
      await expectPrivate({ headers: () => Object.fromEntries(res.headers) });
      assert.equal((await res.text()).includes("Authorized synthetic draft"), false);
    }
    assert.equal(draftFetches, before);
  });

  await check("draft entry rejects malicious destinations before issuing any cookie", async () => {
    for (const slug of ["//example.invalid", "https://example.invalid", "/%2fexample.invalid", "/%252fexample.invalid", "/\\example.invalid", "/posts/../api/contact", "/posts/%0d%0aX-Test:probe", "/api/contact", "/posts/example?secret=probe"]) {
      const params = new URLSearchParams({ secret: fixtureSecret, slug });
      const res = await fetch(`${origin}/api/draft?${params}`, { redirect: "manual" });
      assert.equal(res.status, 400);
      assert.equal(res.headers.has("set-cookie"), false);
      assert.equal(res.headers.has("location"), false);
      await expectPrivate({ headers: () => Object.fromEntries(res.headers) });
    }
    const unauthorized = await fetch(`${origin}/api/draft?slug=/live-preview/posts/security-fixture&secret=incorrect`);
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.headers.has("set-cookie"), false);
  });

  await check("authorized preview works with a private, nonindexable response and no analytics", async () => {
    const { context, analyticsRequests } = await contextWithNetworkStubs();
    const params = new URLSearchParams({ secret: fixtureSecret, slug: "/live-preview/posts/security-fixture", _storyblok: "900001" });
    const entry = await context.request.get(`${origin}/api/draft?${params}`, { maxRedirects: 0 });
    assert.equal(entry.status(), 307);
    await expectPrivate(entry);
    const destination = new URL(entry.headers().location);
    assert.equal(destination.origin, origin);
    assert.equal(destination.searchParams.get("_storyblok"), "900001");
    assert.equal(destination.searchParams.has("secret"), false);
    const cookies = await context.cookies();
    assert.ok(cookies.some((cookie) => cookie.name === "__prerender_bypass" && cookie.httpOnly && cookie.secure));
    assert.ok(cookies.some((cookie) => cookie.name === "storyblok-preview-session" && cookie.httpOnly && cookie.secure && cookie.sameSite === "None"));
    const bypass = cookies.find((cookie) => cookie.name === "__prerender_bypass");
    const beforeDenied = draftFetches;
    for (const suffix of ["", "; storyblok-preview-session=forged"]) {
      const denied = await fetch(`${origin}/live-preview/posts/security-fixture`, { headers: { Cookie: `${bypass.name}=${bypass.value}${suffix}` } });
      assert.equal(denied.status, 404);
    }
    assert.equal(draftFetches, beforeDenied);
    await context.addInitScript(() => localStorage.setItem("analytics-consent-v1", "granted"));
    const page = await context.newPage();
    const res = await page.goto(destination.href);
    assert.equal(res.status(), 200);
    await expectPrivate(res);
    await page.getByRole("heading", { name: "Authorized synthetic draft", exact: true }).waitFor();
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
    assert.equal(analyticsRequests.length, 0);

    // Draft metadata remains private even on a proxy-excluded path.
    const excluded = await context.request.get(`${origin}/public-security-fixture`);
    assert.equal(excluded.status(), 200);
    assert.match(excluded.headers()["cache-control"], /no-store/);
    assert.match(await excluded.text(), /name="robots" content="noindex, nofollow"/);

    // A same-origin iframe exercises the editor bridge without contacting Storyblok.
    await page.route(`${origin}/integration-editor`, (route) => route.fulfill({
      contentType: "text/html", body: `<html><body><iframe src="${destination.href.replaceAll("&", "&amp;")}"></iframe></body></html>`,
    }));
    await page.goto(`${origin}/integration-editor`);
    let frame;
    for (let attempt = 0; attempt < 60; attempt++) {
      frame = page.frames().find((item) => item.url().includes("/live-preview/"));
      if (frame && await frame.evaluate(() => typeof window.__bridgeCallback === "function").catch(() => false)) break;
      await delay(100);
    }
    assert.ok(frame && await frame.evaluate(() => typeof window.__bridgeCallback === "function"), "Editor bridge did not register");
    await frame.evaluate(() => window.__bridgeCallback({ action: "input", story: {
      id: 900001, uuid: "security-fixture-en", name: "Synthetic update", full_slug: "posts/security-fixture", alternates: [],
      content: { _uid: "synthetic-post", component: "post", language: "english", title: "Updated through authorized bridge", intro: "Safe", content: "Safe", date: "2026-01-01", image: [] },
    } }));
    await frame.getByRole("heading", { name: "Updated through authorized bridge", exact: true }).waitFor();
    const publicResponse = await fetch(`${origin}/posts/security-fixture`);
    const publicHtml = await publicResponse.text();
    assert.equal(publicHtml.includes("Updated through authorized bridge"), false);
    assert.equal(publicHtml.includes("Authorized synthetic draft"), false);
  });

  await check("rendered Markdown and JSON-LD remain safe and preserve editorial features", async () => {
    const { context } = await contextWithNetworkStubs();
    const page = await context.newPage();
    await page.goto(`${origin}/posts/security-fixture`);
    await settle(page);
    assert.equal(await page.evaluate(() => window.__securityProbe ?? false), false);
    assert.equal(await page.locator("article [onerror], article [onclick], article iframe, article svg").count(), 0);
    assert.equal(await page.locator('article a[href^="javascript:"]').count(), 0);
    assert.equal(await page.locator("article aside.note").textContent(), "Safe editorial note");
    assert.equal(await page.locator("article table tbody td").count(), 2);
    assert.equal(await page.locator("article code.hljs.language-js .hljs-keyword").textContent(), "const");
    assert.equal(await page.locator('article a[href="/posts"]').count(), 1);
    assert.equal(await page.locator("article").evaluate((article) => [...article.querySelectorAll('a[href^="#"]')].every((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))), true);
    const data = await page.locator('script[type="application/ld+json"]').textContent();
    assert.equal(data.includes("</script>"), false);
    // SEO now intentionally normalizes the intro before serializing JSON-LD.
    assert.equal(JSON.parse(data).description, "Safe intro");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page.goto(`${origin}/es-co/posts/security-fixture-es`);
    assert.equal(await page.locator("html").getAttribute("lang"), "es-CO");
  });

  await check("no analytics loads before consent or after rejection, including legacy preferences", async () => {
    const { context, analyticsRequests } = await contextWithNetworkStubs();
    await context.addInitScript(() => localStorage.setItem("cookieConsent", "true"));
    const page = await context.newPage();
    await page.goto(`${origin}/posts/security-fixture`);
    await settle(page);
    assert.equal(analyticsRequests.length, 0);
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    await page.reload();
    await settle(page);
    assert.equal(await page.getByRole("button", { name: "Accept", exact: true }).isVisible(), false);
    assert.equal(analyticsRequests.length, 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("analytics-consent-v1")), "denied");
  });

  await check("acceptance, SPA navigation, reload, and revocation keep a single analytics runtime", async () => {
    const { context, analyticsRequests } = await contextWithNetworkStubs();
    const page = await context.newPage();
    await page.goto(`${origin}/posts/security-fixture`);
    await settle(page);
    await grant(page);
    assert.equal(analyticsRequests.length, 1);
    assert.equal(await page.locator("script#consented-analytics").count(), 1);
    assert.equal(await page.evaluate(() => window.dataLayer.filter(([type]) => type === "event").length), 1);
    await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    assert.equal(analyticsRequests.length, 1);
    await page.locator('nav a[href="/posts"]').first().click();
    await page.waitForURL(`${origin}/posts`);
    await page.waitForFunction(() => window.dataLayer.filter(([type]) => type === "event").length === 2);
    assert.equal(analyticsRequests.length, 1);
    await context.addCookies([{ name: "_ga", value: "synthetic-cookie", url: origin }]);
    await page.reload();
    await page.waitForFunction(() => window.__analyticsStubLoaded === true);
    assert.equal(await page.locator("script#consented-analytics").count(), 1);
    assert.equal(await page.evaluate(() => window.dataLayer.filter(([type]) => type === "event").length), 1);
    assert.ok((await context.cookies()).some(({ name, value }) => name === "_ga" && value === "synthetic-cookie"));
    await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    await page.waitForFunction(() => localStorage.getItem("analytics-consent-v1") === "denied" && !document.getElementById("consented-analytics"));
    assert.equal((await context.cookies()).some(({ name }) => name === "_ga"), false);
    const requestsAfterRevocation = analyticsRequests.length;
    await page.reload();
    await settle(page);
    assert.equal(analyticsRequests.length, requestsAfterRevocation);
  });

  await check("cross-tab revocation stops analytics and preview query parameters exclude measurement", async () => {
    const { context, analyticsRequests } = await contextWithNetworkStubs();
    const first = await context.newPage();
    await first.goto(`${origin}/posts/security-fixture`);
    await settle(first);
    await grant(first);
    const second = await context.newPage();
    await second.goto(`${origin}/posts/security-fixture`);
    await second.waitForFunction(() => window.__analyticsStubLoaded === true);
    await first.getByRole("button", { name: "Cookie preferences", exact: true }).click();
    await first.getByRole("button", { name: "Decline", exact: true }).click();
    await second.waitForFunction(() => localStorage.getItem("analytics-consent-v1") === "denied" && !document.getElementById("consented-analytics"));
    await first.close();
    await second.evaluate(() => {
      document.cookie = "analytics-opt-out=; Max-Age=0; Path=/";
      localStorage.setItem("analytics-consent-v1", "granted");
    });
    const before = analyticsRequests.length;
    await second.goto(`${origin}/posts/security-fixture?_storyblok=900001`);
    await settle(second);
    assert.equal(analyticsRequests.length, before);
  });

  await check("missing server preview credentials fail closed and analytics requires explicit enablement", async () => {
    await withRuntime({ STORYBLOK_PREVIEW_TOKEN: "", ANALYTICS_ENABLED: "false" }, async (runtimeOrigin) => {
      const params = new URLSearchParams({ secret: fixtureSecret, slug: "/live-preview/posts/security-fixture" });
      const res = await fetch(`${runtimeOrigin}/api/draft?${params}`, { redirect: "manual" });
      assert.equal(res.status, 503);
      assert.equal(res.headers.has("set-cookie"), false);
      await expectPrivate({ headers: () => Object.fromEntries(res.headers) });
      const { context, analyticsRequests } = await contextWithNetworkStubs(runtimeOrigin);
      const page = await context.newPage();
      await page.goto(`${runtimeOrigin}/posts/security-fixture`);
      await settle(page);
      await page.getByRole("button", { name: "Accept", exact: true }).click();
      await delay(200);
      assert.equal(analyticsRequests.length, 0);
    });
  });

  await check("development never loads production analytics even with consent and explicit enablement", async () => {
    await withRuntime({ NODE_ENV: "development" }, async (runtimeOrigin) => {
      const forged = { Cookie: "__prerender_bypass=forged-development-cookie; storyblok-preview-session=forged" };
      const denied = await fetch(`${runtimeOrigin}/live-preview/posts/security-fixture`, { headers: forged });
      assert.equal(denied.status, 404);
      const publicResponse = await fetch(`${runtimeOrigin}/posts/security-fixture`, { headers: forged });
      assert.equal((await publicResponse.text()).includes("Authorized synthetic draft"), false);
      const { context, analyticsRequests } = await contextWithNetworkStubs(runtimeOrigin);
      const page = await context.newPage();
      await page.goto(`${runtimeOrigin}/posts/security-fixture`);
      await settle(page);
      await page.getByRole("button", { name: "Accept", exact: true }).click();
      await delay(200);
      assert.equal(analyticsRequests.length, 0);
    });
  });

  console.log(`Integration checks passed: ${completed}. External analytics and editor requests were stubbed.`);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(5000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
  const reportPath = join(evidence.directory, `integration-${Date.now()}-${process.pid}.json`);
  await writeFile(reportPath, JSON.stringify({ schema: 1, candidate, startedAt, finishedAt: new Date().toISOString(), passedGroups: completed, imageFixtureDiagnostics, checks: checkResults }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(`Sanitized integration evidence: ${reportPath.slice(root.length)}`);
}
