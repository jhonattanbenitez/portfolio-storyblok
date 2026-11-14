import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { createRequire } from "node:module";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { buildEditorialCatalog, findEditorialEntry } from "../../lib/editorial-catalog.ts";
import { resolveLocalizedStoryUrls } from "../../lib/storyblok-data.ts";
import { deterministicLocalizedUrls } from "../../utils/seo.ts";
import { markdownToHtml } from "../../utils/markdown.ts";
import formatDate from "../../utils/formatDate.ts";
import fixtureProvider from "./bilingual-batch-fixtures.js";

const { loadPreparedBilingualBatchFixture, makeBatchMode } = fixtureProvider;
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const publicOrigin = "https://www.jhonattan.dev";
const rehearsalUuid = "7693c6a8-5b9b-470b-9f93-15f1d867eda5";
const rehearsalPaths = ["/posts/i18n-pilot-black-box-20261113", "/es-co/posts/i18n-piloto-caja-negra-20261113"];
const fail = (condition, code) => assert.ok(condition, code);
const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function privateDirectory(path) {
  const target = resolve(path);
  const repository = await realpath(sourceRoot);
  const inside = (value) => value === repository || value.startsWith(repository + "/");
  fail(!inside(target), "BATCH_PRIVATE_ARTIFACTS_MUST_STAY_OUTSIDE_GIT");
  let parent = target;
  while (!existsSync(parent)) parent = dirname(parent);
  fail(!inside(await realpath(parent)), "BATCH_PRIVATE_PARENT_RESOLVES_INSIDE_REPOSITORY");
  await mkdir(target, { recursive: true, mode: 0o700 });
  const physical = await realpath(target);
  fail(!inside(physical), "BATCH_PRIVATE_DIRECTORY_RESOLVES_INSIDE_REPOSITORY");
  await chmod(physical, 0o700);
  return physical;
}

export async function loadBatchSimulation(path) {
  fail(typeof path === "string" && path.startsWith("/"), "BATCH_PRIVATE_INPUT_ABSOLUTE_PATH_REQUIRED");
  fail(!resolve(path).startsWith(sourceRoot), "BATCH_LEXICAL_INPUT_MUST_STAY_OUTSIDE_REPOSITORY");
  const resolved = await realpath(path);
  fail(!resolved.startsWith(sourceRoot), "BATCH_REAL_EDITORIAL_INPUT_MUST_STAY_OUTSIDE_REPOSITORY");
  fail(((await stat(resolved)).mode & 0o077) === 0, "BATCH_INPUT_PRIVATE_PERMISSIONS_REQUIRED");
  return loadPreparedBilingualBatchFixture(resolved);
}

function catalogFor(simulation) {
  return buildEditorialCatalog({ stories: simulation.stories, spanishStories: simulation.spanishStories,
    categories: simulation.stories.filter((story) => story.content?.component === "Category") });
}

export function inspectBatchProjection(simulation, mode = "approved") {
  const data = makeBatchMode(simulation, mode);
  const catalog = catalogFor(data);
  const baselineCatalog = buildEditorialCatalog({ stories: simulation.baselineStories,
    categories: simulation.baselineStories.filter((story) => story.content?.component === "Category") });
  fail(catalog.entries.length === 30 && baselineCatalog.entries.length === 30, "BATCH_EXPECTED_THIRTY_HISTORICAL_URLS");
  fail(exact(catalog.entries.map((entry) => entry.href).sort(), baselineCatalog.entries.map((entry) => entry.href).sort()), "BATCH_HISTORICAL_URL_SET_CHANGED");
  if (mode === "approved") {
    fail(new Set(catalog.entries.map((entry) => entry.uuid)).size === 15, "BATCH_EXPECTED_FIFTEEN_PRIMARY_IDENTITIES");
    fail(catalog.entries.every((entry) => entry.model === "field"), "BATCH_NOT_ALL_PAIRS_ADOPTED");
  } else {
    fail(catalog.entries.some((entry) => entry.model === "field") && catalog.entries.some((entry) => entry.model === "legacy"), "BATCH_EXPECTED_MIXED_MODEL_TRANSITION");
  }
  for (const pair of data.pairs) {
    const en = simulation.baselineStories.find((story) => story.uuid === pair.enUuid);
    const es = simulation.baselineStories.find((story) => story.uuid === (pair.esUuid || pair.esLegacyUuid));
    fail(en && es, "BATCH_PAIR_SOURCE_NOT_FOUND");
    for (const [href, source] of [[pair.enPath, en], [pair.esPath, es]]) {
      const entry = findEditorialEntry(catalog, href);
      fail(entry, "BATCH_ROUTE_MISSING");
      for (const key of ["title", "intro", "content", "date", "image"]) fail(exact(entry.story.content[key], source.content[key]), "BATCH_EDITORIAL_TEXT_DATE_OR_IMAGES_CHANGED");
      const legacy = findEditorialEntry(baselineCatalog, href);
      fail(entry.categoryUuid === legacy?.categoryUuid && entry.categorySlug === legacy?.categorySlug, "BATCH_CATEGORY_BEHAVIOR_CHANGED");
      fail(entry.localizedUrls.length === 2 && entry.localizedUrls.some((url) => url.href === pair.enPath) && entry.localizedUrls.some((url) => url.href === pair.esPath), "BATCH_ALTERNATE_PAIR_INVALID");
    }
  }
  return { data, catalog, baselineCatalog };
}

export async function expectedPublishedSitemapUrls(simulation) {
  const stories = simulation.baselineStories;
  const byId = new Map(stories.map((story) => [story.id, story]));
  const byUuid = new Map(stories.map((story) => [story.uuid, story]));
  const paths = new Set(["/landing"]);
  for (const path of ["/", "/posts", "/case-studies", "/categories", "/contact"]) {
    for (const url of deterministicLocalizedUrls(path)) paths.add(url.href);
  }
  async function addStory(story, currentLocale) {
    const urls = await resolveLocalizedStoryUrls({ story, currentLocale, version: "published",
      fetchAlternate: async () => byId.get(story.alternates?.[0]?.id) || null,
      onWarning: () => { throw new Error("BATCH_BASELINE_SITEMAP_RELATION_INVALID"); } });
    return urls;
  }
  // Baseline posts/categories provide their own historical route; both members
  // are present independently. Do not obtain these paths from the new catalog.
  for (const story of stories.filter((item) => ["post", "Category"].includes(item.content?.component))) {
    const locale = story.content.language === "spanish" ? "es-co" : "en";
    const own = (await addStory(story, locale)).find((url) => url.locale === locale);
    fail(own, "BATCH_BASELINE_SITEMAP_ROUTE_MISSING"); paths.add(own.href);
  }
  const home = stories.find((story) => story.full_slug === "case-studies/home");
  fail(home, "BATCH_BASELINE_CASE_STUDIES_HOME_MISSING");
  const section = home.content.body?.find((item) => item.component === "case_studies_section");
  const references = Array.isArray(section?.case_studies) ? section.case_studies : [];
  for (const reference of references) {
    const story = typeof reference === "string" ? byUuid.get(reference) : byUuid.get(reference.uuid) || reference;
    fail(story?.content?.component === "case_study", "BATCH_BASELINE_CASE_STUDY_RELATION_MISSING");
    for (const url of await addStory(story, "en")) paths.add(url.href);
  }
  fail(paths.size === 45, "BATCH_BASELINE_SITEMAP_SET_NOT_FORTY_FIVE");
  return [...paths].map((path) => publicOrigin + (path === "/" ? "" : path)).sort();
}

export async function installOwnedFontMock(output) {
  // Reuse an already downloaded local font. No real request to Google Fonts is
  // needed; this test does not certify typography or original image bytes.
  const directory = join(sourceRoot, ".next", "static", "media");
  const supplied = process.env.BILINGUAL_BATCH_FONT_FILE;
  const name = existsSync(directory) ? (await readdir(directory)).find((file) => file.endsWith(".woff2")) : null;
  const source = supplied || (name && join(directory, name));
  fail(source && existsSync(source), "BATCH_LOCAL_FONT_FILE_REQUIRED");
  const destination = join(output, "owned-font.woff2");
  await cp(source, destination); await chmod(destination, 0o600);
  const bytes = await readFile(destination);
  let requests = 0;
  const server = createHttpServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/owned-font.woff2") {
      response.writeHead(404); response.end(); return;
    }
    requests++;
    response.writeHead(200, { "content-type": "font/woff2", "content-length": bytes.length });
    response.end(bytes);
  });
  await new Promise((ready, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", ready); });
  const localOrigin = `http://127.0.0.1:${server.address().port}`;
  const mockPath = join(output, "google-font-mock.cjs");
  const require = createRequire(import.meta.url);
  const { getFontAxes } = require("next/dist/compiled/@next/font/dist/google/get-font-axes.js");
  const { getGoogleFontsUrl } = require("next/dist/compiled/@next/font/dist/google/get-google-fonts-url.js");
  const stylesheetUrl = getGoogleFontsUrl("Inter", getFontAxes("Inter", ["variable"], ["normal"]), "swap");
  const css = `/* latin */\n@font-face {\n font-family: 'Inter';\n font-style: normal;\n font-weight: 100 900;\n font-display: swap;\n src: url(${localOrigin}/owned-font.woff2) format('woff2');\n}`;
  // Turbopack serializes this module into a Rust HashMap; a Proxy with no
  // enumerable keys becomes an empty map and fails with "url not found".
  // Its font-file path fetches over HTTP, so serve existing bytes locally.
  await writeFile(mockPath, `module.exports = ${JSON.stringify({ [stylesheetUrl]: css }, null, 2)};\n`, { mode: 0o600 });
  return { mockPath, sourceSha256: sha(bytes), stylesheetUrl, localOrigin, get requests() { return requests; },
    close: () => new Promise((done) => { if (server.listening) server.close(done); else done(); }) };
}

async function prepareIsolatedActivation(fixtureRoot) {
  if (!process.env.BILINGUAL_BATCH_ACTIVATION_PATCH) return { applied: false, runtimeEnvironment: "preview" };
  const patchPath = await realpath(process.env.BILINGUAL_BATCH_ACTIVATION_PATCH);
  fail(!patchPath.startsWith(sourceRoot), "BATCH_ACTIVATION_PATCH_MUST_STAY_OUTSIDE_REPOSITORY");
  const review = JSON.parse(await readFile(join(dirname(patchPath), "activation-patch-review.json"), "utf8"));
  const target = join(fixtureRoot, "lib/editorial-catalog.ts");
  const original = await readFile(target, "utf8");
  const candidate = await readFile(join(dirname(patchPath), "candidate/lib/editorial-catalog.ts"), "utf8");
  const oldPredicate = '  return typeof window === "undefined" && env.STORYBLOK_FIELD_TRANSLATION_ENABLED === "true" &&\n    env.VERCEL_ENV !== "production";';
  const newPredicate = '  return typeof window === "undefined" && env.STORYBLOK_FIELD_TRANSLATION_ENABLED === "true";';
  fail(original.split(oldPredicate).length === 2, "BATCH_ACTIVATION_PREIMAGE_NOT_EXPECTED");
  fail(candidate === original.replace(oldPredicate, newPredicate), "BATCH_ACTIVATION_CANDIDATE_HAS_EXTRA_CHANGES");
  fail(review.source === "lib/editorial-catalog.ts" && sha(original) === review.sourceSha256 && sha(candidate) === review.candidateSha256 &&
    sha(await readFile(patchPath)) === review.patchSha256, "BATCH_ACTIVATION_PATCH_HASH_MISMATCH");
  // Apply only the constrained candidate content inside the empty owned copy;
  // never execute a generic patch or modify the repository's runtime module.
  await writeFile(target, candidate);
  const { isEditorialModelEnabled } = await import(pathToFileURL(target).href);
  fail(isEditorialModelEnabled({}) === false &&
    isEditorialModelEnabled({ VERCEL_ENV: "production", STORYBLOK_FIELD_TRANSLATION_ENABLED: "false" }) === false &&
    isEditorialModelEnabled({ VERCEL_ENV: "production", STORYBLOK_FIELD_TRANSLATION_ENABLED: "true" }) === true,
  "BATCH_ACTIVATION_PREDICATE_INVALID");
  fail(sha(await readFile(join(sourceRoot, "lib/editorial-catalog.ts"))) === review.sourceSha256, "BATCH_REPOSITORY_RUNTIME_CHANGED");
  return { applied: true, runtimeEnvironment: "production", sourceSha256: review.sourceSha256, candidateSha256: review.candidateSha256,
    patchSha256: review.patchSha256, defaultOffVerified: true, privateCopyOnly: true };
}

async function relativeFiles(directory, prefix = "") {
  const paths = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    fail(!entry.isSymbolicLink(), "BATCH_REUSE_SOURCE_SYMLINK_FORBIDDEN");
    if (entry.isDirectory()) paths.push(...await relativeFiles(directory, path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths.sort();
}

export async function verifyReusableBatchBuild(identityInput, sourcePath) {
  fail(typeof identityInput === "string" && !resolve(identityInput).startsWith(sourceRoot), "BATCH_REUSE_IDENTITY_MUST_STAY_OUTSIDE_REPOSITORY");
  const identityPath = await realpath(identityInput);
  fail(!identityPath.startsWith(sourceRoot) && ((await stat(identityPath)).mode & 0o077) === 0, "BATCH_REUSE_IDENTITY_NOT_PRIVATE");
  const identity = JSON.parse(await readFile(identityPath, "utf8"));
  const fixtureRoot = await realpath(identity.fixtureRoot);
  fail(!fixtureRoot.startsWith(sourceRoot) && resolve(identity.sourceRoot) === resolve(sourceRoot), "BATCH_REUSE_SOURCE_ROOT_INVALID");
  fail(identity.simulatedFuturePublication === true && identity.realConsolidatedPublicationObserved === false &&
    identity.featureEnabledAtBuild === true && identity.analyticsEnabled === false && identity.privateConfigurationCopied === false,
  "BATCH_REUSE_BUILD_CONFIGURATION_INVALID");
  fail(identity.sourceSnapshotSha256 === sha(await readFile(sourcePath)), "BATCH_REUSE_DATASET_CHANGED");
  const hook = join(fixtureRoot, "tests/integration/bilingual-batch-fixtures.js");
  fail(sha(await readFile(hook)) === identity.fixtureHookSha256 &&
    sha(await readFile(join(sourceRoot, "tests/integration/bilingual-batch-fixtures.js"))) === identity.fixtureHookSha256,
  "BATCH_REUSE_FIXTURE_HOOK_CHANGED");
  const buildId = (await readFile(join(fixtureRoot, ".next/BUILD_ID"), "utf8")).trim();
  fail(buildId && buildId === identity.buildId, "BATCH_REUSE_BUILD_ID_CHANGED");
  const activation = identity.isolatedActivationCandidate;
  fail(activation && ["preview", "production"].includes(activation.runtimeEnvironment), "BATCH_REUSE_ACTIVATION_MISSING");
  const checkedSources = [];
  for (const directory of ["src", "lib", "utils", "components", "contexts", "hooks", "translations", "public"]) {
    const originalFiles = await relativeFiles(join(sourceRoot, directory));
    fail(exact(originalFiles, await relativeFiles(join(fixtureRoot, directory))), "BATCH_REUSE_APPLICATION_FILE_SET_CHANGED");
    for (const relative of originalFiles) {
      const path = `${directory}/${relative}`;
      const original = await readFile(join(sourceRoot, path));
      const copy = await readFile(join(fixtureRoot, path));
      if (path === "lib/editorial-catalog.ts" && activation.applied) {
        const before = '  return typeof window === "undefined" && env.STORYBLOK_FIELD_TRANSLATION_ENABLED === "true" &&\n    env.VERCEL_ENV !== "production";';
        const after = '  return typeof window === "undefined" && env.STORYBLOK_FIELD_TRANSLATION_ENABLED === "true";';
        fail(original.toString().split(before).length === 2 && copy.toString() === original.toString().replace(before, after) &&
          sha(original) === activation.sourceSha256 && sha(copy) === activation.candidateSha256, "BATCH_REUSE_ACTIVATION_CANDIDATE_CHANGED");
      } else fail(sha(original) === sha(copy), "BATCH_REUSE_APPLICATION_SOURCE_CHANGED");
      checkedSources.push({ path, sha256: sha(copy) });
    }
  }
  // next-env.d.ts is intentionally excluded: Next regenerates this type-only
  // file during a production build. Runtime sources and lock/config stay exact.
  for (const path of ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", ".gitignore", ".vercelignore",
    "node_modules/next/package.json", "node_modules/react/package.json", "node_modules/react-dom/package.json"]) {
    if (!existsSync(join(sourceRoot, path))) continue;
    const original = await readFile(join(sourceRoot, path));
    const copy = await readFile(join(fixtureRoot, path));
    fail(sha(original) === sha(copy), "BATCH_REUSE_LOCK_CONFIG_OR_FRAMEWORK_CHANGED");
    checkedSources.push({ path, sha256: sha(copy) });
  }
  for (const path of [".env", ".env.local", ".env.production", ".env.production.local", ".git"]) fail(!existsSync(join(fixtureRoot, path)), "BATCH_REUSE_ROOT_CONTAINS_PRIVATE_CONFIGURATION");
  const artifactInput = process.env.BILINGUAL_BATCH_REUSE_ARTIFACT_MANIFEST || join(dirname(identityPath), "compiled-artifacts-before-resume.json");
  fail(!resolve(artifactInput).startsWith(sourceRoot), "BATCH_REUSE_ARTIFACT_MANIFEST_MUST_STAY_OUTSIDE_REPOSITORY");
  const artifactPath = await realpath(artifactInput);
  fail(!artifactPath.startsWith(sourceRoot) && ((await stat(artifactPath)).mode & 0o077) === 0, "BATCH_REUSE_ARTIFACT_MANIFEST_NOT_PRIVATE");
  const artifacts = JSON.parse(await readFile(artifactPath, "utf8"));
  fail(artifacts.schema === 1 && artifacts.fixtureRoot === fixtureRoot && artifacts.buildId === buildId && Array.isArray(artifacts.records), "BATCH_REUSE_ARTIFACT_IDENTITY_INVALID");
  const compiledRoot = join(fixtureRoot, ".next");
  const compiledPaths = [];
  for (const directory of ["server", "static", "build"]) compiledPaths.push(...(await relativeFiles(join(compiledRoot, directory))).map((path) => `${directory}/${path}`));
  for (const entry of await readdir(compiledRoot, { withFileTypes: true })) if (entry.isFile() && (entry.name === "BUILD_ID" || entry.name.endsWith(".json"))) compiledPaths.push(entry.name);
  fail(exact(compiledPaths.sort(), artifacts.records.map((record) => record.path).sort()), "BATCH_REUSE_COMPILED_ARTIFACT_SET_CHANGED");
  for (const record of artifacts.records) {
    fail(typeof record.path === "string" && !record.path.startsWith("/") && !record.path.split("/").includes(".."), "BATCH_REUSE_ARTIFACT_PATH_INVALID");
    const bytes = await readFile(join(compiledRoot, record.path));
    fail(bytes.length === record.bytes && sha(bytes) === record.sha256, "BATCH_REUSE_COMPILED_ARTIFACT_CHANGED");
  }
  const prior = JSON.parse(await readFile(join(dirname(identityPath), "results.json"), "utf8"));
  fail(prior.build?.status === "passed" && prior.build.exitCode === 0, "BATCH_REUSE_ORIGINAL_BUILD_NOT_PASSED");
  return { fixtureRoot, hook, activation, identity, identityPath, checkedSources, compiledArtifactCount: artifacts.records.length,
    artifactManifestSha256: sha(await readFile(artifactPath)), artifactRecordingStage: artifacts.recordingStage,
    sourceSnapshotSha256: identity.sourceSnapshotSha256, buildId,
    build: { status: "passed", exitCode: 0, buildsExecuted: 0, reusedValidatedBuild: true,
      originalBuildEvidence: identityPath, originalBuild: prior.build } };
}

async function run() {
  process.umask(0o077);
  const output = await privateDirectory(process.env.BILINGUAL_BATCH_EVIDENCE_DIR || await mkdtemp(join(tmpdir(), "bilingual-batch-http-")));
  const writeJson = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  const results = [];
  let build = { status: "not-run" }, fixtureRoot, browser, fonts;
  try {
    const simulation = await loadBatchSimulation(process.env.BILINGUAL_BATCH_SIMULATION);
    const sourcePath = await realpath(process.env.BILINGUAL_BATCH_SIMULATION);
    // Fail fast on real preservation gaps rather than spend a build masking them.
    inspectBatchProjection(simulation);
    inspectBatchProjection(simulation, "mixed");
    const expectedSitemapUrls = await expectedPublishedSitemapUrls(simulation);
    const reuse = process.env.BILINGUAL_BATCH_REUSE_BUILD ? await verifyReusableBatchBuild(process.env.BILINGUAL_BATCH_REUSE_BUILD, sourcePath) : null;
    fixtureRoot = reuse?.fixtureRoot || await privateDirectory(process.env.BILINGUAL_BATCH_TEST_ROOT || await mkdtemp(join(tmpdir(), "bilingual-batch-next-")));
    fail(output !== fixtureRoot && !output.startsWith(fixtureRoot + "/") && !fixtureRoot.startsWith(output + "/"), "BATCH_EVIDENCE_CANNOT_BE_SERVED");
    fail(!sourcePath.startsWith(fixtureRoot + "/"), "BATCH_PRIVATE_INPUT_CANNOT_BE_SERVED");
    if (!reuse) {
      fail((await readdir(fixtureRoot)).length === 0, "BATCH_ISOLATED_ROOT_MUST_BE_EMPTY");
      for (const name of ["src", "lib", "utils", "components", "contexts", "hooks", "translations", "public", "tests", "scripts"]) await cp(join(sourceRoot, name), join(fixtureRoot, name), { recursive: true });
    for (const name of ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", "next-env.d.ts", ".gitignore", ".vercelignore"]) {
      if (existsSync(join(sourceRoot, name))) await cp(join(sourceRoot, name), join(fixtureRoot, name));
    }
      await cp(join(sourceRoot, "node_modules"), join(fixtureRoot, "node_modules"), { recursive: true, verbatimSymlinks: true });
    }
    for (const name of [".env", ".env.local", ".env.production", ".env.production.local", ".git"]) fail(!existsSync(join(fixtureRoot, name)), "BATCH_ISOLATED_ROOT_CONTAINS_PRIVATE_CONFIGURATION");
    fail(existsSync(join(fixtureRoot, ".gitignore")), "BATCH_ISOLATED_ROOT_REQUIRES_IGNORE_RULES");
    const activation = reuse?.activation || await prepareIsolatedActivation(fixtureRoot);
    await writeJson("activation-candidate.json", activation);
    if (reuse) { build = reuse.build; await writeJson("reuse-verification.json", reuse); }
    else fonts = await installOwnedFontMock(output);
    const hook = join(fixtureRoot, "tests/integration/bilingual-batch-fixtures.js");
    const baseEnv = Object.fromEntries(["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR"].filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
    const runId = `${process.pid}-${Date.now().toString(36)}`;
    const env = { ...baseEnv, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ANALYTICS_ENABLED: "false", SITE_URL: publicOrigin,
      STORYBLOK_FIELD_TRANSLATION_ENABLED: "true", VERCEL_ENV: activation.runtimeEnvironment, STORYBLOK_TOKEN: `owned-batch-${runId}`,
      STORYBLOK_PREVIEW_TOKEN: `owned-batch-private-${runId}`, STORYBLOK_DRAFT_SECRET: `owned-batch-secret-${runId}`,
      BILINGUAL_BATCH_FIXTURES: "1", BILINGUAL_BATCH_FIXTURE_DATA: sourcePath,
      ...(fonts ? { NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fonts.mockPath, BILINGUAL_BATCH_FONT_ORIGIN: fonts.localOrigin } : {}),
      NODE_OPTIONS: `--require=${hook}` };
    if (!reuse) {
    const child = spawn(process.execPath, [join(fixtureRoot, "node_modules/next/dist/bin/next"), "build"], { cwd: fixtureRoot, env, stdio: ["ignore", "pipe", "pipe"] });
    let log = ""; child.stdout.on("data", (part) => { log += part.toString(); }); child.stderr.on("data", (part) => { log += part.toString(); });
    const [buildCode] = await once(child, "exit");
    for (const key of ["STORYBLOK_TOKEN", "STORYBLOK_PREVIEW_TOKEN", "STORYBLOK_DRAFT_SECRET"]) log = log.replaceAll(env[key], "[REDACTED_OWNED_FIXTURE]");
    log = log.replace(/([?&](?:token|secret|password|authorization)=)[^\s&#]+/gi, "$1[REDACTED]");
    await writeFile(join(output, "build.log"), log, { mode: 0o600 });
    build = { status: buildCode === 0 ? "passed" : "failed", exitCode: buildCode, buildsExecuted: 1, fontMock: true, fontSha256: fonts.sourceSha256,
      fontMockStylesheetUrl: fonts.stylesheetUrl, localFontRequests: fonts.requests };
    fail(buildCode === 0, "BATCH_ISOLATED_BUILD_FAILED");
    fail(fonts.requests > 0, "BATCH_LOCAL_FONT_MOCK_NOT_REQUESTED");
    await fonts.close();
    }
    const buildId = (await readFile(join(fixtureRoot, ".next/BUILD_ID"), "utf8")).trim();
    await writeJson("build-identity.json", { buildId, sourceRoot, fixtureRoot, sourceSnapshotSha256: sha(await readFile(sourcePath)),
      fixtureHookSha256: sha(await readFile(hook)), simulatedFuturePublication: true, realConsolidatedPublicationObserved: false,
      featureEnabledAtBuild: true, analyticsEnabled: false, privateConfigurationCopied: false, fontsMockedFromLocalFile: true,
      isolatedActivationCandidate: activation, reusedValidatedBuild: !!reuse, originalBuildEvidence: reuse?.identityPath });
    const executablePath = process.env.BROWSER_EXECUTABLE || ["/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
    fail(executablePath, "BATCH_INSTALLED_CHROMIUM_REQUIRED");
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const expectedHtml = new Map();
    for (const story of simulation.baselineStories.filter((story) => story.content?.component === "post")) {
      for (const key of ["intro", "content"]) expectedHtml.set(`${story.uuid}:${key}`, await markdownToHtml(story.content[key]));
    }
    for (const mode of ["approved", "mixed"]) {
      const { catalog } = inspectBatchProjection(simulation, mode);
      const probe = createServer(); await new Promise((resolveListen) => probe.listen(0, "127.0.0.1", resolveListen));
      const port = probe.address().port; await new Promise((resolveClose) => probe.close(resolveClose));
      const origin = `http://127.0.0.1:${port}`;
      const runtime = spawn(process.execPath, [join(fixtureRoot, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
        cwd: fixtureRoot, env: { ...env, STORYBLOK_TOKEN: `owned-batch-${runId}-${mode}`, BILINGUAL_BATCH_MODE: mode,
          BILINGUAL_BATCH_RUNTIME_IPC: "1", BILINGUAL_BATCH_LOCAL_ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
      const upstream = [], errors = [], failures = []; let analyticsRequests = 0;
      runtime.on("message", (value) => { if (value?.type === "bilingual-batch-fetch") upstream.push(value); });
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const placeholder = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4dQAAAAASUVORK5CYII=", "base64");
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin && url.pathname === "/_next/image") return route.fulfill({ contentType: "image/png", body: placeholder });
        if (url.origin === origin) return route.continue();
        if (["www.googletagmanager.com", "www.google-analytics.com"].includes(url.hostname)) analyticsRequests++;
        return route.abort();
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.name));
      page.on("requestfailed", (request) => failures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText || "UNKNOWN" }));
      await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      let status = "failed";
      try {
        await new Promise((ready, reject) => {
          const timeout = setTimeout(() => reject(new Error("BATCH_RUNTIME_READINESS_TIMEOUT")), 45000);
          let text = "";
          const inspect = (part) => { text = (text + part.toString()).slice(-4096); if (/Ready in/.test(text)) { clearTimeout(timeout); ready(); } };
          runtime.stdout.on("data", inspect); runtime.stderr.on("data", inspect);
          runtime.once("error", () => { clearTimeout(timeout); reject(new Error("BATCH_RUNTIME_START_FAILED")); });
          runtime.once("exit", () => { clearTimeout(timeout); reject(new Error("BATCH_RUNTIME_EXITED_BEFORE_READY")); });
        });
        const rows = [];
        for (const pair of simulation.pairs) {
          for (const [href, uuid] of [[pair.enPath, pair.enUuid], [pair.esPath, pair.esUuid || pair.esLegacyUuid]]) {
            const source = simulation.baselineStories.find((story) => story.uuid === uuid);
            const projected = findEditorialEntry(catalog, href);
            const response = await page.goto(origin + href);
            fail(response.status() === 200, "BATCH_ARTICLE_HTTP_STATUS");
            await page.locator(".post-article > header").getByRole("heading", { level: 1, name: source.content.title, exact: true }).waitFor();
            fail(await page.locator('link[rel="canonical"]').count() === 1, "BATCH_DUPLICATE_CANONICAL");
            fail(await page.locator('link[rel="canonical"]').getAttribute("href") === publicOrigin + href, "BATCH_CANONICAL_CHANGED");
            for (const [lang, path] of [["en", pair.enPath], ["es-CO", pair.esPath]]) fail(await page.locator(`link[rel="alternate"][hreflang="${lang}"]`).getAttribute("href") === publicOrigin + path, "BATCH_HREFLANG_CHANGED");
            fail(await page.locator('link[rel="alternate"][hreflang="x-default"]').getAttribute("href") === publicOrigin + pair.enPath, "BATCH_DEFAULT_ALTERNATE_CHANGED");
            for (const key of ["intro", "content"]) {
              const selector = key === "intro" ? ".post-intro" : ".post-body";
              const normalized = await page.evaluate((html) => { const div = document.createElement("div"); div.innerHTML = html; return div.innerHTML; }, expectedHtml.get(`${uuid}:${key}`));
              fail(await page.locator(selector).innerHTML() === normalized, "BATCH_RENDERED_MARKDOWN_CHANGED");
            }
            fail((await page.locator("article header").textContent()).includes(formatDate(source.content.date)), "BATCH_VISIBLE_EDITORIAL_DATE_CHANGED");
            if (source.content.image?.[0]?.filename) {
              const image = page.locator(".post-article > section").first().locator("img");
              fail(await image.count() === 1, "BATCH_HERO_IMAGE_MISSING");
              const src = new URL(await image.getAttribute("src"), origin);
              fail((src.searchParams.get("url") || src.href) === source.content.image[0].filename, "BATCH_HERO_IMAGE_SOURCE_CHANGED");
            }
            const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
            fail(ld.url === publicOrigin + href && ld.datePublished === projected.story.first_published_at && ld.dateModified === projected.story.updated_at, "BATCH_JSON_LD_CONTRACT_INVALID");
            rows.push({ path: href, status: response.status(), expectedPrimaryUuid: projected.uuid, model: projected.model,
              canonical: true, hreflang: true, exactRenderedText: true, visibleDate: true, jsonLd: true });
          }
          await page.getByRole("button", { name: "Switch to English", exact: true }).click(); await page.waitForURL(origin + pair.enPath);
          await page.getByRole("button", { name: "Switch to Spanish", exact: true }).click(); await page.waitForURL(origin + pair.esPath);
        }
        for (const locale of ["en", "es-co"]) {
          await page.goto(origin + (locale === "en" ? "/posts" : "/es-co/posts"));
          for (const entry of catalog.entries.filter((entry) => entry.locale === locale)) {
            const link = page.getByRole("link", { name: entry.story.content.title, exact: true }); await link.waitFor();
            fail(await link.getAttribute("href") === entry.href, "BATCH_LISTING_URL_CHANGED");
          }
        }
        const categoryPaths = [...new Set(catalog.entries.filter((entry) => entry.categorySlug).map((entry) => `${entry.locale === "es-co" ? "/es-co" : ""}/categories/${entry.categorySlug}`))];
        for (const path of categoryPaths) {
          await page.goto(origin + path);
          for (const entry of catalog.entries.filter((entry) => `${entry.locale === "es-co" ? "/es-co" : ""}/categories/${entry.categorySlug}` === path)) {
            const link = page.getByRole("link", { name: entry.story.content.title, exact: true }); await link.waitFor();
            fail(await link.getAttribute("href") === entry.href, "BATCH_CATEGORY_URL_CHANGED");
          }
        }
        const xml = await (await fetch(origin + "/sitemap.xml")).text();
        const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
        fail(urls.length === 45 && new Set(urls).size === 45, "BATCH_SITEMAP_LOST_OR_DUPLICATE_URL");
        fail(exact([...urls].sort(), expectedSitemapUrls), "BATCH_COMPLETE_BASELINE_SITEMAP_SET_CHANGED");
        for (const entry of catalog.entries) fail(urls.filter((url) => url === publicOrigin + entry.href).length === 1, "BATCH_ARTICLE_SITEMAP_ENTRY_INVALID");
        const sitemapRows = await page.evaluate((value) => {
          const doc = new DOMParser().parseFromString(value, "application/xml");
          if (doc.getElementsByTagName("parsererror").length) return [];
          return [...doc.getElementsByTagName("url")].map((node) => ({
            url: node.getElementsByTagName("loc")[0]?.textContent,
            lastmod: node.getElementsByTagName("lastmod")[0]?.textContent,
            alternates: Object.fromEntries([...node.getElementsByTagNameNS("*", "link")].map((link) => [link.getAttribute("hreflang"), link.getAttribute("href")])),
          }));
        }, xml);
        for (const entry of catalog.entries) {
          const row = sitemapRows.find((item) => item.url === publicOrigin + entry.href);
          fail(row && Date.parse(row.lastmod) === Date.parse(entry.story.updated_at), "BATCH_SITEMAP_LASTMOD_INVALID");
          for (const alternate of entry.localizedUrls) fail(row.alternates[alternate.locale === "es-co" ? "es-CO" : "en"] === publicOrigin + alternate.href, "BATCH_SITEMAP_ALTERNATE_CHANGED");
        }
        fail(!xml.includes(rehearsalUuid) && !rehearsalPaths.some((path) => xml.includes(path)), "BATCH_REHEARSAL_IN_SITEMAP");
        for (const path of rehearsalPaths) {
          const response = await fetch(origin + path + "?draft=true&_storyblok_lang=es_co"); const html = await response.text();
          fail(response.status === 404 || /name="robots" content="noindex/.test(html), "BATCH_REHEARSAL_INDEXABLE");
          fail(!/<article(?:\s|>)/.test(html) && !html.includes(rehearsalUuid), "BATCH_REHEARSAL_CONTENT_EXPOSED");
        }
        fail(upstream.some((request) => request.byUuid && request.locale === "es-co"), "BATCH_NATIVE_CDA_REPRESENTATIONS_NOT_REQUESTED");
        fail(!upstream.some((request) => request.version === "draft" || request.locale === "es_co"), "BATCH_DRAFT_OR_INCORRECT_LOCALE_FETCHED");
        fail(errors.length === 0 && analyticsRequests === 0, "BATCH_BROWSER_OR_ANALYTICS_FAILURE");
        await page.goto(origin + simulation.pairs[0].esPath); await page.screenshot({ path: join(output, `${mode}-desktop.png`), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: join(output, `${mode}-mobile.png`), fullPage: true });
        status = "passed";
        results.push({ mode, status, articleUrls: rows.length, primaryIdentities: new Set(catalog.entries.map((entry) => entry.uuid)).size,
          fieldRoutes: catalog.entries.filter((entry) => entry.model === "field").length, sitemapUrls: urls.length,
          categoryPages: categoryPaths.length, localeSwitchPairs: simulation.pairs.length, analyticsRequests, javascriptErrors: errors.length });
        await writeJson(`${mode}-routes.json`, rows);
        console.log(`PASS bilingual-batch-${mode}`);
      } catch (error) {
        results.push({ mode, status, errorType: error.name, code: /^[A-Z0-9_]+$/.test(error.message || "") ? error.message : "ASSERTION_OR_BROWSER_FAILURE" });
        await page.screenshot({ path: join(output, `${mode}-failure.png`), fullPage: true }).catch(() => {});
        throw error;
      } finally {
        await writeJson(`${mode}-diagnostics.json`, { status, upstream, errors, analyticsRequests, requestFailures: failures });
        await context.tracing.stop({ path: join(output, `${mode}-trace.zip`) }); await context.close();
        runtime.kill("SIGTERM"); if (runtime.exitCode === null) await once(runtime, "exit");
      }
    }
  } catch (error) {
    await writeJson("failure.json", { type: error.name, code: /^[A-Z0-9_]+$/.test(error.message || "") ? error.message : "ASSERTION_OR_BROWSER_FAILURE" });
    process.exitCode = 1;
  } finally {
    await fonts?.close();
    await browser?.close();
    await writeJson("results.json", { sourceKind: "future-consolidation-simulation", realConsolidatedPublicationObserved: false,
      privateMAPIStateEstablishedByThisTest: false, fixtureRoot, build, results, passed: results.filter((row) => row.status === "passed").length,
      outcome: process.exitCode ? "FAILED_OR_BLOCKED" : "BATCH_SIMULATION_PASS_REAL_PUBLICATION_SEPARATE",
      limitations: ["Original image bytes replaced with local placeholders", "Google font mocked from an already downloaded local font", "No production or authenticated Vercel QA performed"] });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run().catch(() => { console.error("BILINGUAL_BATCH_LOCAL_VALIDATION_BLOCKED"); process.exitCode = 1; });
