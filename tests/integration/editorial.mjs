import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

// Real Next HTTP/Chromium, owned in-memory upstream only. This is deliberately
// separate from tests against the production candidate and from real CDA tests.
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const output = process.env.EDITORIAL_TEST_EVIDENCE_DIR
  ? resolve(process.env.EDITORIAL_TEST_EVIDENCE_DIR)
  : await mkdtemp(join(tmpdir(), "editorial-http-evidence-"));
await mkdir(output, { recursive: true, mode: 0o700 });
const fixtureRoot = process.env.EDITORIAL_TEST_ROOT
  ? resolve(process.env.EDITORIAL_TEST_ROOT)
  : await mkdtemp(join(tmpdir(), "editorial-next-fixture-"));
const executablePath = process.env.BROWSER_EXECUTABLE || ["/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
if (!executablePath) throw new Error("An installed Chromium is required; no browser will be downloaded");

const sourceDirectories = ["src", "lib", "utils", "components", "contexts", "hooks", "translations", "public", "tests", "scripts"];
const sourceFiles = ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", "next-env.d.ts"];
if (!process.env.EDITORIAL_TEST_ROOT) {
  for (const name of sourceDirectories) await cp(join(sourceRoot, name), join(fixtureRoot, name), { recursive: true });
  for (const name of sourceFiles) if (existsSync(join(sourceRoot, name))) await cp(join(sourceRoot, name), join(fixtureRoot, name));
  // Keep the installed dependency tree inside Turbopack's hermetic root. This
  // copies existing packages, performs no install, and changes no source config.
  await cp(join(sourceRoot, "node_modules"), join(fixtureRoot, "node_modules"), { recursive: true, verbatimSymlinks: true });
}
for (const name of [".env", ".env.local", ".env.production", ".env.production.local", ".git"]) {
  if (existsSync(join(fixtureRoot, name))) throw new Error("Fixture build root must not contain private configuration or Git metadata");
}
const runId = `${process.pid}-${Date.now().toString(36)}`;
const publicOrigin = "https://www.jhonattan.dev";
const baseEnv = Object.fromEntries(["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR"].filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]));
const fixtureEnv = {
  ...baseEnv, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ANALYTICS_ENABLED: "false",
  SITE_URL: publicOrigin, STORYBLOK_FIELD_TRANSLATION_ENABLED: "true", VERCEL_ENV: "preview",
  STORYBLOK_TOKEN: `owned-editorial-public-${runId}`, STORYBLOK_PREVIEW_TOKEN: `owned-editorial-private-${runId}`,
  NEXT_PUBLIC_STORYBLOK_TOKEN: `owned-editorial-client-${runId}`,
  STORYBLOK_DRAFT_SECRET: "owned-editorial-draft-secret",
  EDITORIAL_INTEGRATION_FIXTURES: "1",
  NODE_OPTIONS: `--require=${join(fixtureRoot, "tests/integration/editorial-fixtures.js")}`,
};
const results = [];
const startedAt = new Date().toISOString();
let browser;
let buildResult = { status: "not-run" };

async function writeJson(name, value) {
  await writeFile(join(output, name), JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
}
async function runBuild() {
  const child = spawn(process.execPath, [join(fixtureRoot, "node_modules/next/dist/bin/next"), "build"], { cwd: fixtureRoot, env: fixtureEnv, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (chunk) => { log += chunk.toString(); });
  child.stderr.on("data", (chunk) => { log += chunk.toString(); });
  const [code] = await once(child, "exit");
  // Build inputs and all upstream data are synthetic; still redact token-shaped
  // values before retaining logs, and never emit raw build output to the user.
  for (const name of ["STORYBLOK_TOKEN", "STORYBLOK_PREVIEW_TOKEN", "NEXT_PUBLIC_STORYBLOK_TOKEN", "STORYBLOK_DRAFT_SECRET"]) log = log.replaceAll(fixtureEnv[name], "[REDACTED_SYNTHETIC]");
  await writeFile(join(output, "fixture-build.log"), log, { mode: 0o600 });
  buildResult = { status: code === 0 ? "passed" : "failed", exitCode: code, bundler: "turbopack" };
  assert.equal(code, 0, "Isolated fixture production build failed; inspect sanitized fixture-build.log");
}

async function unusedPort() {
  const probe = createServer();
  await new Promise((resolveListen) => probe.listen(0, "127.0.0.1", resolveListen));
  const port = probe.address().port;
  await new Promise((resolveClose) => probe.close(resolveClose));
  return port;
}

async function withRuntime(name, overrides, run) {
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const env = { ...fixtureEnv, EDITORIAL_FIXTURE_RUNTIME_IPC: "1", STORYBLOK_TOKEN: `owned-editorial-public-${runId}-${name}`, ...overrides };
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete env[key];
  const child = spawn(process.execPath, [join(fixtureRoot, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: fixtureRoot, env, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  const upstream = [];
  child.on("message", (value) => { if (value?.type === "editorial-fixture-fetch") upstream.push(value); });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  const failedRequests = [];
  let analyticsRequests = 0;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (["www.googletagmanager.com", "www.google-analytics.com"].includes(url.hostname)) analyticsRequests++;
    return route.abort();
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  page.on("pageerror", (error) => consoleErrors.push({ type: error.name }));
  page.on("requestfailed", (request) => { const url = new URL(request.url()); failedRequests.push({ origin: url.origin, path: url.pathname }); });
  const start = Date.now();
  let status = "failed";
  try {
    await new Promise((ready, fail) => {
      const deadline = setTimeout(() => fail(new Error("Runtime readiness deadline exceeded")), 45_000);
      let text = "";
      const inspect = (chunk) => {
        text = (text + chunk.toString()).slice(-4096);
        if (/Ready in/.test(text)) { clearTimeout(deadline); ready(); }
      };
      child.stdout.on("data", inspect);
      child.stderr.on("data", inspect);
      child.once("error", (error) => { clearTimeout(deadline); fail(error); });
      child.once("exit", () => { clearTimeout(deadline); fail(new Error("Runtime exited before readiness")); });
    });
    await run({ page, origin, upstream });
    assert.equal(analyticsRequests, 0);
    assert.deepEqual(consoleErrors, []);
    status = "passed";
    results.push({ name, status, durationMs: Date.now() - start, upstreamRequests: upstream.length, draftRequests: upstream.filter((entry) => entry.version === "draft").length });
    console.log(`PASS ${name}`);
  } catch (error) {
    await page.screenshot({ path: join(output, `${name}-failure.png`), fullPage: true }).catch(() => {});
    results.push({ name, status, durationMs: Date.now() - start, errorType: error.name, upstreamRequests: upstream.length, draftRequests: upstream.filter((entry) => entry.version === "draft").length });
    throw error;
  } finally {
    await writeJson(`${name}-diagnostics.json`, { status, consoleErrors, failedRequests, upstream, analyticsRequests });
    await context.tracing.stop({ path: join(output, `${name}-trace.zip`) });
    await context.close();
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
  }
}

async function assertNoDraftExposure({ page, origin, upstream }) {
  for (const path of ["/posts/editorial-private-draft", "/es-co/posts/borrador-editorial-privado"]) {
    const response = await fetch(origin + path + "?draft=true&_storyblok_lang=es_co");
    const html = await response.text();
    assert.ok(response.status === 404 || /name="robots" content="noindex/.test(html));
    assert.ok(!html.includes("Unpublished private editorial fixture"));
  }
  const response = await fetch(origin + "/live-preview/posts/editorial-private-draft");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  await page.goto(origin + "/posts/editorial-fixture");
  await page.getByRole("heading", { level: 1, name: "Editorial fixture English", exact: true }).waitFor();
  assert.equal(upstream.filter((request) => request.version === "draft").length, 0);
}

try {
  if (!process.env.EDITORIAL_TEST_SKIP_BUILD) await runBuild();
  const buildId = (await readFile(join(fixtureRoot, ".next/BUILD_ID"), "utf8")).trim();
  await writeJson("fixture-build-identity.json", { scope: "ISOLATED_SYNTHETIC_FIXTURE_BUILD_NOT_RELEASE_CANDIDATE", fixtureRoot, buildId, sourceRoot, enabledAtBuild: true, dependencyCopyNoInstall: true, sourceConfigurationUnchanged: true, analyticsEnabled: false, realCdaUsed: false, realPrivateCredentialsUsed: false });
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  await withRuntime("enabled-shared-editorial-projection", {}, async ({ page, origin, upstream }) => {
    for (const [alias, target] of [["/es-co/posts/editorial-fixture", "/es-co/posts/editorial-fixture-es"], ["/posts/editorial-fixture-es", "/posts/editorial-fixture"]]) {
      const redirect = await fetch(origin + alias + "?ref=owned&tag=a&tag=b", { redirect: "manual" });
      if (redirect.status === 308) {
        const destination = new URL(redirect.headers.get("location"), origin);
        assert.equal(destination.pathname, target);
        assert.equal(destination.searchParams.get("ref"), "owned");
        assert.deepEqual(destination.searchParams.getAll("tag"), ["a", "b"]);
      } else {
        // Next's documented streaming redirect can send a 200 shell before
        // redirect metadata. C3 already supports that shape; require its SEO
        // safeguards, then check actual browser navigation and every query.
        assert.equal(redirect.status, 200);
        const html = await redirect.text();
        assert.match(html, /name="robots" content="noindex, follow"/);
        assert.ok(html.includes(`rel="canonical" href="${publicOrigin}${target}"`));
      }
      await page.goto(origin + alias + "?ref=owned&tag=a&tag=b");
      await page.waitForURL(origin + target + "?ref=owned&tag=a&tag=b");
      const destination = new URL(page.url());
      assert.equal(destination.searchParams.get("ref"), "owned");
      assert.deepEqual(destination.searchParams.getAll("tag"), ["a", "b"]);
    }
    await page.goto(origin + "/posts/editorial-fixture?ref=owned");
    await page.getByRole("heading", { level: 1, name: "Editorial fixture English", exact: true }).waitFor();
    await page.getByRole("button", { name: "Switch to Spanish", exact: true }).click();
    await page.waitForURL(origin + "/es-co/posts/editorial-fixture-es?ref=owned");
    await page.getByRole("heading", { level: 1, name: "Artículo editorial unificado", exact: true }).waitFor();
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), publicOrigin + "/es-co/posts/editorial-fixture-es");
    assert.equal(await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute("href"), publicOrigin + "/posts/editorial-fixture");
    await page.getByRole("button", { name: "Switch to English", exact: true }).click();
    await page.waitForURL(origin + "/posts/editorial-fixture?ref=owned");
    await page.getByRole("heading", { level: 1, name: "Editorial fixture English", exact: true }).waitFor();
    await page.goto(origin + "/es-co/posts");
    const card = page.getByRole("link", { name: "Artículo editorial unificado", exact: true });
    await card.waitFor();
    assert.equal(await card.getAttribute("href"), "/es-co/posts/editorial-fixture-es");
    await page.goto(origin + "/es-co/categories/categoria-editorial");
    await page.getByRole("heading", { level: 1, name: /Categoría editorial/ }).waitFor();
    await page.getByRole("link", { name: "Artículo editorial unificado", exact: true }).waitFor();
    const xml = await (await fetch(origin + "/sitemap.xml")).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    assert.equal(urls.filter((url) => url === publicOrigin + "/posts/editorial-fixture").length, 1);
    assert.equal(urls.filter((url) => url === publicOrigin + "/es-co/posts/editorial-fixture-es").length, 1);
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(!xml.includes("editorial-private-draft") && !xml.includes("borrador-editorial-privado"));
    assert.ok(upstream.some((request) => request.byUuid && request.locale === "es-co" && request.version === "published"));
    assert.ok(!upstream.some((request) => request.byUuid && request.locale === "es_co"));
    await assertNoDraftExposure({ page, origin, upstream });
    await page.screenshot({ path: join(output, "enabled-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(output, "enabled-mobile.png"), fullPage: true });
  });

  for (const [name, overrides] of [
    ["default-disabled-legacy", { STORYBLOK_FIELD_TRANSLATION_ENABLED: undefined }],
    ["production-explicit-off-legacy", { VERCEL_ENV: "production", STORYBLOK_FIELD_TRANSLATION_ENABLED: "false" }],
  ]) {
    await withRuntime(name, overrides, async ({ page, origin, upstream }) => {
      await page.goto(origin + "/es-co/posts/editorial-fixture-es");
      await page.getByRole("heading", { level: 1, name: "Artículo legacy español", exact: true }).waitFor();
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), publicOrigin + "/es-co/posts/editorial-fixture-es");
      await assertNoDraftExposure({ page, origin, upstream });
      assert.ok(!upstream.some((request) => request.byUuid));
    });
  }

  await withRuntime("missing-private-token-anonymous-isolation", { STORYBLOK_PREVIEW_TOKEN: undefined }, assertNoDraftExposure);
} finally {
  await browser?.close();
  await writeJson("results.json", { schema: 1, startedAt, finishedAt: new Date().toISOString(), fixtureRoot, syntheticUpstreamOnly: true, realCdaDraftValidated: false, build: buildResult, results, passed: results.filter((result) => result.status === "passed").length, failed: results.filter((result) => result.status === "failed").length + (buildResult.status === "failed" ? 1 : 0) });
}
