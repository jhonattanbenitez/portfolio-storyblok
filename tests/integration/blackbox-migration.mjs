import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { buildEditorialCatalog, calculateDraftEditorialApprovalHash, findEditorialEntry } from "../../lib/editorial-catalog.ts";
import { markdownToHtml } from "../../utils/markdown.ts";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const EN_PATH = "/posts/black-box-abstraction-thinking-in-boxes";
const ES_PATH = "/es-co/posts/abstraccion-de-caja-negra-pensar-en-cajas";
const fields = ["title", "intro", "content"];
const clone = (value) => structuredClone(value);
const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (condition, code) => assert.ok(condition, code);

/** A future projection derived from published data; never an executable MAPI body. */
export function prepareBlackboxSimulation(snapshot) {
  fail(snapshot?.schema === 1 && snapshot.sourceKind === "cda-published-snapshot" && snapshot.version === "published" && Array.isArray(snapshot.stories), "INVALID_PUBLISHED_SNAPSHOT_CONTRACT");
  const baselineStories = clone(snapshot.stories);
  const en = baselineStories.find((story) => story.full_slug === EN_PATH.slice(1));
  const es = baselineStories.find((story) => story.full_slug === ES_PATH.slice(7));
  fail(en && es && en.id !== es.id && en.uuid !== es.uuid, "MISSING_DISTINCT_CURRENT_PILOT_PAIR");
  fail(en.content.language === "english" && es.content.language === "spanish", "INVALID_PILOT_CONTENT_LANGUAGES");
  fail(en.published_at && es.published_at && en.published !== false && es.published !== false, "PUBLISHED_TRANSPORT_SNAPSHOTS_REQUIRED");
  fail(en.group_id === es.group_id && en.group_id && en.alternates?.length === 1 && es.alternates?.length === 1 && en.alternates[0].id === es.id && es.alternates[0].id === en.id && en.alternates[0].full_slug === es.full_slug && es.alternates[0].full_slug === en.full_slug && en.alternates[0].published === true && es.alternates[0].published === true, "PILOT_PAIR_NOT_RECIPROCALLY_PUBLISHED");
  fail(baselineStories.filter((story) => story.content.component === "post").length === 30, "EXPECTED_THIRTY_PUBLISHED_POSTS");
  const rawReviewProposal = clone(en);
  for (const key of fields) rawReviewProposal.content[key + "__i18n__es_co"] = es.content[key];
  rawReviewProposal.content.slug_es = es.slug;
  const proposedHash = calculateDraftEditorialApprovalHash(rawReviewProposal);
  fail(/^[a-f0-9]{64}$/.test(proposedHash || ""), "REVIEW_HASH_UNAVAILABLE");
  rawReviewProposal.content.es_translation_approved = true;
  rawReviewProposal.content.es_approved_hash = proposedHash;
  const futureEnglish = clone(rawReviewProposal);
  for (const key of Object.keys(futureEnglish.content)) if (key.includes("__i18n__")) delete futureEnglish.content[key];
  const spanishRepresentation = clone(futureEnglish);
  spanishRepresentation.full_slug = "es-co/" + en.full_slug;
  spanishRepresentation.lang = "es-co";
  for (const key of fields) spanishRepresentation.content[key] = es.content[key];
  const stories = baselineStories.map((story) => story.uuid === en.uuid ? futureEnglish : clone(story));
  const categories = stories.filter((story) => story.content.component === "Category");
  const catalog = buildEditorialCatalog({ stories, spanishStories: [spanishRepresentation], categories });
  const englishEntry = findEditorialEntry(catalog, EN_PATH);
  const spanishEntry = findEditorialEntry(catalog, ES_PATH);
  const preservation = {
    englishOriginalContentFieldsExact: Object.keys(en.content).filter((key) => !["slug_es", "es_translation_approved", "es_approved_hash"].includes(key)).every((key) => exact(en.content[key], futureEnglish.content[key])),
    legacySpanishSnapshotExact: exact(stories.find((story) => story.uuid === es.uuid), es),
    spanishEditorialTextExact: fields.every((key) => spanishEntry && exact(spanishEntry.story.content[key], es.content[key])),
    spanishDateExact: exact(spanishEntry?.story.content.date, es.content.date),
    spanishImagesExact: exact(spanishEntry?.story.content.image, es.content.image),
    spanishCategoryResolvedToLegacyUuid: spanishEntry?.categoryUuid === es.content.category_ref?.id,
    spanishFirstPublishedAtExact: exact(spanishEntry?.story.first_published_at, es.first_published_at),
    spanishUpdatedAtExact: exact(spanishEntry?.story.updated_at, es.updated_at),
    spanishPublishedAtExact: exact(spanishEntry?.story.published_at, es.published_at),
  };
  fail(englishEntry?.uuid === en.uuid && spanishEntry?.uuid === en.uuid, "FUTURE_PROJECTION_IDENTITY_NOT_ADOPTED");
  return {
    schema: 1, sourceKind: "future-consolidation-simulation", managementWritePayload: false,
    realPublicationObserved: false, draftStateVerified: false, baselineStories, stories,
    spanishRepresentation, rawReviewProposal, proposedHash, preservation,
    pilot: { enUuid: en.uuid, esLegacyUuid: es.uuid, enPath: EN_PATH, esPath: ES_PATH },
  };
}

export async function loadBlackboxMigrationFixtures(path) {
  fail(typeof path === "string" && path.startsWith("/"), "PRIVATE_SNAPSHOT_ABSOLUTE_PATH_REQUIRED");
  const resolved = await realpath(path);
  fail(!resolved.startsWith(sourceRoot), "REAL_SNAPSHOTS_MUST_REMAIN_OUTSIDE_REPOSITORY");
  const metadata = await stat(resolved);
  fail((metadata.mode & 0o077) === 0, "PRIVATE_SNAPSHOT_PERMISSIONS_REQUIRED");
  return prepareBlackboxSimulation(JSON.parse(await readFile(resolved, "utf8")));
}

async function ensurePrivateOutsideDirectory(path) {
  const candidate = resolve(path);
  const repository = await realpath(sourceRoot);
  const isRepository = (value) => value === repository || value.startsWith(repository + "/");
  fail(!isRepository(candidate), "PRIVATE_ARTIFACTS_MUST_REMAIN_OUTSIDE_REPOSITORY");
  let existing = candidate;
  while (!existsSync(existing)) existing = dirname(existing);
  fail(!isRepository(await realpath(existing)), "PRIVATE_ARTIFACT_PARENT_RESOLVES_INSIDE_REPOSITORY");
  await mkdir(candidate, { recursive: true, mode: 0o700 });
  const resolved = await realpath(candidate);
  fail(!isRepository(resolved), "PRIVATE_ARTIFACT_PATH_RESOLVES_INSIDE_REPOSITORY");
  await chmod(resolved, 0o700);
  return resolved;
}

async function run() {
  process.umask(0o077);
  const output = await ensurePrivateOutsideDirectory(process.env.BLACKBOX_MIGRATION_EVIDENCE_DIR || await mkdtemp(join(tmpdir(), "blackbox-migration-evidence-")));
  const results = [];
  let browser;
  let build = { status: "not-run" };
  let fixtureRoot;
  const writeJson = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  try {
    fixtureRoot = await ensurePrivateOutsideDirectory(process.env.BLACKBOX_MIGRATION_TEST_ROOT || await mkdtemp(join(tmpdir(), "blackbox-migration-next-")));
    fail(output !== fixtureRoot && !output.startsWith(fixtureRoot + "/"), "PRIVATE_EVIDENCE_CANNOT_BE_SERVED_FROM_ISOLATED_ROOT");
    const privateSource = await realpath(process.env.BLACKBOX_MIGRATION_SOURCE);
    fail(privateSource !== fixtureRoot && !privateSource.startsWith(fixtureRoot + "/"), "PRIVATE_SOURCE_CANNOT_BE_SERVED_FROM_ISOLATED_ROOT");
    const simulation = await loadBlackboxMigrationFixtures(process.env.BLACKBOX_MIGRATION_SOURCE);
    const originalEn = simulation.baselineStories.find((story) => story.uuid === simulation.pilot.enUuid);
    const originalEs = simulation.baselineStories.find((story) => story.uuid === simulation.pilot.esLegacyUuid);
    const fixtureDataPath = join(output, "simulation-data.json");
    await writeJson("simulation-data.json", simulation);
    await writeJson("simulation-review.json", { sourceKind: simulation.sourceKind, managementWritePayload: false, realPublicationObserved: false, draftStateVerified: false, proposedHash: simulation.proposedHash, pilot: simulation.pilot, preservation: simulation.preservation, sourceSnapshotSha256: createHash("sha256").update(await readFile(process.env.BLACKBOX_MIGRATION_SOURCE)).digest("hex") });
    await writeJson("publication-simulation-diff.json", { sourceKind: "non-executable-publication-simulation-diff", managementWritePayload: false, draftStateVerified: false, sourceEnUuid: originalEn.uuid, sourceEnContentHash: hash(originalEn.content), simulationContentHash: hash(simulation.rawReviewProposal.content), changes: Object.fromEntries([...fields.map((key) => key + "__i18n__es_co"), "slug_es", "es_translation_approved", "es_approved_hash"].map((key) => [key, { existed: Object.hasOwn(originalEn.content, key), before: originalEn.content[key] ?? null, after: simulation.rawReviewProposal.content[key] }])), preservedOriginalKeys: Object.keys(originalEn.content).filter((key) => !["slug_es", "es_translation_approved", "es_approved_hash"].includes(key)), note: "Simulation from published CDA only; not safe to submit to MAPI without current editable-state/concurrency checks." });
    if (!process.env.BLACKBOX_MIGRATION_TEST_ROOT) {
      for (const name of ["src", "lib", "utils", "components", "contexts", "hooks", "translations", "public", "tests", "scripts"]) await cp(join(sourceRoot, name), join(fixtureRoot, name), { recursive: true });
      for (const name of ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", "next-env.d.ts", ".gitignore", ".vercelignore"]) if (existsSync(join(sourceRoot, name))) await cp(join(sourceRoot, name), join(fixtureRoot, name));
      await cp(join(sourceRoot, "node_modules"), join(fixtureRoot, "node_modules"), { recursive: true, verbatimSymlinks: true });
    }
    for (const name of [".env", ".env.local", ".env.production", ".env.production.local", ".git"]) fail(!existsSync(join(fixtureRoot, name)), "ISOLATED_ROOT_CONTAINS_PRIVATE_CONFIGURATION");
    fail(existsSync(join(fixtureRoot, ".gitignore")), "ISOLATED_ROOT_MUST_PRESERVE_IGNORE_RULES");
    const publicOrigin = "https://www.jhonattan.dev";
    const runId = `${process.pid}-${Date.now().toString(36)}`;
    const baseEnv = Object.fromEntries(["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR"].filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
    const env = { ...baseEnv, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ANALYTICS_ENABLED: "false", SITE_URL: publicOrigin, STORYBLOK_FIELD_TRANSLATION_ENABLED: "true", VERCEL_ENV: "preview", STORYBLOK_TOKEN: `owned-blackbox-published-${runId}`, STORYBLOK_PREVIEW_TOKEN: `owned-blackbox-private-${runId}`, STORYBLOK_DRAFT_SECRET: `owned-blackbox-draft-secret-${runId}`, BLACKBOX_MIGRATION_FIXTURES: "1", BLACKBOX_MIGRATION_FIXTURE_DATA: fixtureDataPath, NODE_OPTIONS: `--require=${join(fixtureRoot, "tests/integration/blackbox-migration-fixtures.js")}` };
    if (!process.env.BLACKBOX_MIGRATION_SKIP_BUILD) {
      const child = spawn(process.execPath, [join(fixtureRoot, "node_modules/next/dist/bin/next"), "build"], { cwd: fixtureRoot, env, stdio: ["ignore", "pipe", "pipe"] });
      let log = "";
      child.stdout.on("data", (data) => { log += data.toString(); });
      child.stderr.on("data", (data) => { log += data.toString(); });
      const [code] = await once(child, "exit");
      for (const key of ["STORYBLOK_TOKEN", "STORYBLOK_PREVIEW_TOKEN", "STORYBLOK_DRAFT_SECRET"]) log = log.replaceAll(env[key], "[REDACTED_OWNED_FIXTURE]");
      log = log.replace(/([?&](?:token|secret|password|authorization)=)[^\s&#]+/gi, "$1[REDACTED]");
      await writeFile(join(output, "build.log"), log, { mode: 0o600 });
      build = { status: code === 0 ? "passed" : "failed", exitCode: code, bundler: "turbopack" };
      fail(code === 0, "ISOLATED_SIMULATION_BUILD_FAILED");
    }
    const buildId = (await readFile(join(fixtureRoot, ".next/BUILD_ID"), "utf8")).trim();
    await writeJson("build-identity.json", { sourceRoot, fixtureRoot, buildId, sourceKind: "future-consolidation-simulation", realPublicationObserved: false, featureEnabledAtBuild: true, analyticsEnabled: false, privateConfigurationCopied: false, dependencyCopyNoInstall: true });
    const executablePath = process.env.BROWSER_EXECUTABLE || ["/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
    fail(executablePath, "INSTALLED_CHROMIUM_REQUIRED");
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    async function withRuntime(mode, callback) {
      const probe = createServer(); await new Promise((resolveListen) => probe.listen(0, "127.0.0.1", resolveListen)); const port = probe.address().port; await new Promise((resolveClose) => probe.close(resolveClose));
      const origin = `http://127.0.0.1:${port}`;
      const child = spawn(process.execPath, [join(fixtureRoot, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: fixtureRoot, env: { ...env, STORYBLOK_TOKEN: `owned-blackbox-${runId}-${mode}`, BLACKBOX_MIGRATION_MODE: mode, BLACKBOX_FIXTURE_RUNTIME_IPC: "1", BLACKBOX_MIGRATION_LOCAL_ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
      const upstream = [], pageErrors = [], requestFailures = []; let analyticsRequests = 0;
      child.on("message", (value) => { if (value?.type === "blackbox-fixture-fetch") upstream.push(value); });
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const syntheticImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4dQAAAAASUVORK5CYII=", "base64");
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        // Preserve real image URLs/metadata while replacing bytes only in this
        // local browser test. Never let Next's optimizer fetch remote assets.
        if (url.origin === origin && url.pathname === "/_next/image") return route.fulfill({ contentType: "image/png", body: syntheticImage });
        if (url.origin === origin) return route.continue();
        if (["www.googletagmanager.com", "www.google-analytics.com"].includes(url.hostname)) analyticsRequests++;
        return route.abort();
      });
      const page = await context.newPage(); page.on("pageerror", (error) => pageErrors.push(error.name)); page.on("requestfailed", (request) => { const url = new URL(request.url()); requestFailures.push({ path: url.pathname, error: request.failure()?.errorText || "UNKNOWN" }); });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      let status = "failed";
      try {
        await new Promise((ready, reject) => { const timer = setTimeout(() => reject(new Error("RUNTIME_READINESS_TIMEOUT")), 45000); let text = ""; const inspect = (data) => { text = (text + data.toString()).slice(-4096); if (/Ready in/.test(text)) { clearTimeout(timer); ready(); } }; child.stdout.on("data", inspect); child.stderr.on("data", inspect); child.once("error", () => { clearTimeout(timer); reject(new Error("RUNTIME_START_FAILED")); }); child.once("exit", () => { clearTimeout(timer); reject(new Error("RUNTIME_EXITED_BEFORE_READY")); }); });
        await callback({ page, origin, upstream });
        fail(pageErrors.length === 0, "BROWSER_JAVASCRIPT_ERRORS"); fail(analyticsRequests === 0, "UNEXPECTED_ANALYTICS_REQUESTS"); fail(!upstream.some((request) => request.version === "draft"), "UNEXPECTED_DRAFT_REQUESTS");
        status = "passed"; results.push({ mode, status, upstreamRequests: upstream.length, draftRequests: 0, analyticsRequests, javascriptErrors: 0 }); console.log(`PASS blackbox-${mode}`);
      } catch (error) { results.push({ mode, status, errorType: error.name, code: /^[A-Z0-9_]+$/.test(error.message || "") ? error.message : "ASSERTION_OR_BROWSER_FAILURE" }); await page.screenshot({ path: join(output, `${mode}-failure.png`), fullPage: true }).catch(() => {}); throw error; }
      finally { await writeJson(`${mode}-diagnostics.json`, { status, upstream, pageErrors, analyticsRequests, requestFailures }); await context.tracing.stop({ path: join(output, `${mode}-trace.zip`) }); await context.close(); child.kill("SIGTERM"); if (child.exitCode === null) await once(child, "exit"); }
    }
    const catalog = buildEditorialCatalog({ stories: simulation.stories, spanishStories: [simulation.spanishRepresentation], categories: simulation.stories.filter((story) => story.content.component === "Category") });
    const baselineCatalog = buildEditorialCatalog({ stories: simulation.baselineStories, categories: simulation.baselineStories.filter((story) => story.content.component === "Category") });
    await withRuntime("approved", async ({ page, origin, upstream }) => {
      const expectedHtml = async (value) => page.evaluate((html) => { const div = document.createElement("div"); div.innerHTML = html; return div.innerHTML; }, await markdownToHtml(value));
      for (const [path, source] of [[EN_PATH, originalEn], [ES_PATH, originalEs]]) {
        const response = await page.goto(origin + path); fail(response.status() === 200, "PILOT_HTTP_STATUS");
        await page.getByRole("heading", { level: 1, name: source.content.title, exact: true }).waitFor();
        fail(await page.locator('link[rel="canonical"]').getAttribute("href") === publicOrigin + path, "PILOT_CANONICAL_CHANGED");
        fail(await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute("href") === publicOrigin + EN_PATH, "EN_ALTERNATE_CHANGED");
        fail(await page.locator('link[rel="alternate"][hreflang="es-CO"]').getAttribute("href") === publicOrigin + ES_PATH, "ES_ALTERNATE_CHANGED");
        fail(await page.locator(".post-intro").innerHTML() === await expectedHtml(source.content.intro), "PILOT_INTRO_HTML_CHANGED");
        fail(await page.locator(".post-body").innerHTML() === await expectedHtml(source.content.content), "PILOT_MARKDOWN_HTML_CHANGED");
      }
      await page.getByRole("button", { name: "Switch to English", exact: true }).click(); await page.waitForURL(origin + EN_PATH);
      await page.getByRole("button", { name: "Switch to Spanish", exact: true }).click(); await page.waitForURL(origin + ES_PATH);
      for (const locale of ["en", "es-co"]) {
        const projected = findEditorialEntry(catalog, locale === "en" ? EN_PATH : ES_PATH);
        const title = locale === "en" ? originalEn.content.title : originalEs.content.title;
        await page.goto(origin + (locale === "en" ? "/posts" : "/es-co/posts"));
        await page.getByRole("link", { name: title, exact: true }).waitFor();
        fail(await page.getByRole("link", { name: title, exact: true }).getAttribute("href") === projected.href, "LISTING_PILOT_URL_CHANGED");
        fail(projected.categorySlug, "PILOT_CATEGORY_UNRESOLVED");
        await page.goto(origin + `${locale === "en" ? "" : "/es-co"}/categories/${projected.categorySlug}`);
        await page.getByRole("link", { name: title, exact: true }).waitFor();
      }
      const otherEntries = catalog.entries.filter((entry) => ![EN_PATH, ES_PATH].includes(entry.href));
      fail(otherEntries.length === 28, "EXPECTED_TWENTY_EIGHT_OTHER_ARTICLES");
      const otherRows = [];
      for (const entry of otherEntries) {
        const response = await fetch(origin + entry.href); const html = await response.text();
        const baseline = findEditorialEntry(baselineCatalog, entry.href);
        const row = { path: entry.href, status: response.status, canonicalMatches: html.includes(`rel="canonical" href="${publicOrigin}${entry.href}"`), uuidUnchanged: baseline?.uuid === entry.uuid, contentHashUnchanged: hash(entry.story.content) === hash(baseline?.story.content) };
        fail(row.status === 200 && row.canonicalMatches && row.uuidUnchanged && row.contentHashUnchanged, "OTHER_LEGACY_ARTICLE_CHANGED"); otherRows.push(row);
      }
      await writeJson("other-legacy-articles.json", { sourceKind: simulation.sourceKind, count: otherRows.length, results: otherRows });
      const xml = await (await fetch(origin + "/sitemap.xml")).text(); const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
      fail(new Set(urls).size === urls.length, "DUPLICATE_SITEMAP_URL");
      for (const entry of catalog.entries) fail(urls.filter((url) => url === publicOrigin + entry.href).length === 1, "MISSING_OR_DUPLICATE_ARTICLE_IN_SITEMAP");
      fail(!xml.includes("i18n-pilot-black-box-20261113") && !xml.includes("i18n-piloto-caja-negra-20261113"), "OLD_REHEARSAL_IN_SITEMAP");
      await writeJson("sitemap-check.json", { count: urls.length, unique: new Set(urls).size, articleCount: catalog.entries.length, allArticleUrlsPreserved: true, rehearsalAbsent: true });
      for (const path of ["/posts/i18n-pilot-black-box-20261113", "/es-co/posts/i18n-piloto-caja-negra-20261113"]) {
        const response = await fetch(origin + path + "?draft=true&_storyblok_lang=es_co"); const html = await response.text();
        fail(response.status === 404 || /name="robots" content="noindex/.test(html), "REHEARSAL_ROUTE_INDEXABLE");
        fail(!/<article(?:\s|>)/.test(html) && !html.includes("7693c6a8-5b9b-470b-9f93-15f1d867eda5"), "REHEARSAL_CONTENT_EXPOSED");
      }
      fail(upstream.some((request) => request.byUuid && request.locale === "es-co"), "NATIVE_CDA_LOCALE_NOT_REQUESTED");
      await page.goto(origin + ES_PATH); await page.screenshot({ path: join(output, "spanish-desktop.png"), fullPage: true }); await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: join(output, "spanish-mobile.png"), fullPage: true });
      const ld = await page.locator('script[type="application/ld+json"]').textContent(); const value = JSON.parse(ld);
      await writeJson("spanish-seo-preservation.json", {
        sourceKind: simulation.sourceKind,
        timestampContract: "owner-approved-english-base-for-both-locales",
        observedDatePublished: value.datePublished ?? null,
        observedDateModified: value.dateModified ?? null,
        expectedEnglishDatePublished: originalEn.first_published_at ?? null,
        expectedEnglishDateModified: originalEn.updated_at ?? null,
        originalSpanishDatePublished: originalEs.first_published_at ?? null,
        originalSpanishDateModified: originalEs.updated_at ?? null,
        firstPublishedMetadataPreserved: simulation.preservation.spanishFirstPublishedAtExact,
        modifiedMetadataPreserved: simulation.preservation.spanishUpdatedAtExact,
        note: "The owner accepts English-base publication/modification timestamps for the consolidated identity in both locales. Historical Spanish differences remain observations; visible editorial dates, content, images and URLs must still be preserved. This simulation does not establish a real consolidated publication.",
      });
    });
    for (const mode of ["unapproved", "collision"]) await withRuntime(mode, async ({ page, origin }) => {
      const response = await page.goto(origin + ES_PATH); fail(response.status() === 200, "LEGACY_FALLBACK_HTTP_STATUS");
      await page.getByRole("heading", { level: 1, name: originalEs.content.title, exact: true }).waitFor();
      fail(await page.locator('link[rel="canonical"]').getAttribute("href") === publicOrigin + ES_PATH, "LEGACY_FALLBACK_CANONICAL_CHANGED");
      const xml = await (await fetch(origin + "/sitemap.xml")).text(); fail((xml.match(new RegExp(publicOrigin + ES_PATH, "g")) || []).length >= 1, "LEGACY_FALLBACK_MISSING_FROM_SITEMAP");
    });
  } catch (error) { await writeJson("failure.json", { type: error.name, code: /^[A-Z0-9_]+$/.test(error.message || "") ? error.message : "ASSERTION_OR_BROWSER_FAILURE" }); process.exitCode = 1; }
  finally { await browser?.close(); await writeJson("results.json", { sourceKind: "future-consolidation-simulation", realPublicationObserved: false, managementWritePayload: false, fixtureRoot, build, results, passed: results.filter((row) => row.status === "passed").length, failed: results.filter((row) => row.status === "failed").length + (build.status === "failed" ? 1 : 0), outcome: process.exitCode ? "FAILED_OR_BLOCKED" : "SIMULATION_MECHANISM_PASS_EDITORIAL_REVIEW_SEPARATE" }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run().catch(() => { console.error("BLACKBOX_LOCAL_SIMULATION_BLOCKED"); process.exitCode = 1; });
