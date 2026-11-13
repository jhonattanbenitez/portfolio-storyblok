import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const canonicalOrigin = "https://www.jhonattan.dev";
const sourceRoots = ["src", "lib", "utils", "components", "contexts", "hooks", "translations", "public", "tests", "scripts"];
const sourceFiles = ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", ".vercelignore"];
const buildFiles = ["BUILD_ID", "build-manifest.json", "prerender-manifest.json", "required-server-files.json"];
const digest = (value) => createHash("sha256").update(value).digest("hex");

async function walk(path, excludedDirectories = new Set()) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".env")) continue;
    const child = join(path, entry.name);
    if (excludedDirectories.has(child)) continue;
    if (entry.isDirectory()) files.push(...await walk(child, excludedDirectories));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}
async function hashFiles(root, paths) {
  const rows = await Promise.all(paths.map(async (path) => ({ path: relative(root, path), sha256: digest(await readFile(path)) })));
  rows.sort((a, b) => a.path.localeCompare(b.path));
  return rows;
}
async function sourceFingerprint(root) {
  const paths = sourceFiles.map((name) => join(root, name));
  for (const directory of sourceRoots) paths.push(...await walk(join(root, directory)));
  const files = await hashFiles(root, paths);
  return { sha256: digest(JSON.stringify(files)), files };
}
export async function artifactFingerprint(root) {
  const output = join(root, ".next");
  const paths = buildFiles.map((name) => join(output, name));
  // Next 16.4 populates this runtime cache on requests; it is not compiled code.
  const mutableCaches = new Set([join(output, "server", "route-cache")]);
  for (const directory of ["server", "static"]) paths.push(...await walk(join(output, directory), mutableCaches));
  const files = await hashFiles(output, paths);
  return { sha256: digest(JSON.stringify(files)), files };
}
export async function releaseEvidencePaths(root = defaultRoot) {
  const buildId = (await readFile(join(root, ".next/BUILD_ID"), "utf8")).trim();
  if (!/^[\w-]+$/.test(buildId)) throw new Error("Invalid build identifier");
  const directory = join(root, ".next/release-validation", buildId);
  return { buildId, directory, manifest: join(directory, "manifest.json") };
}
export async function recordReleaseManifest(root = defaultRoot) {
  const paths = await releaseEvidencePaths(root);
  const source = await sourceFingerprint(root);
  const artifacts = await artifactFingerprint(root);
  const sitemap = await readFile(join(root, ".next/server/app/sitemap.xml.body"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
  if (!urls.length || urls.some((url) => url.origin !== canonicalOrigin)) throw new Error("Build sitemap does not use the approved canonical origin");
  const manifest = {
    schema: 1, recordedAt: new Date().toISOString(), buildId: paths.buildId,
    head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    node: process.version,
    next: JSON.parse(await readFile(join(root, "node_modules/next/package.json"), "utf8")).version,
    canonicalOrigin, sitemapUrls: urls.length, source, artifacts,
  };
  await mkdir(paths.directory, { recursive: true });
  await writeFile(paths.manifest, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return { buildId: paths.buildId, sourceSha256: source.sha256, artifactSha256: artifacts.sha256, manifest: relative(root, paths.manifest) };
}
export async function verifyReleaseManifest(root = defaultRoot) {
  const paths = await releaseEvidencePaths(root);
  const manifest = JSON.parse(await readFile(paths.manifest, "utf8"));
  if (manifest.schema !== 1 || manifest.buildId !== paths.buildId || manifest.canonicalOrigin !== canonicalOrigin) throw new Error("Release manifest does not identify this approved build");
  const source = await sourceFingerprint(root);
  const artifacts = await artifactFingerprint(root);
  if (source.sha256 !== manifest.source.sha256) throw new Error("Source changed after the recorded production build; rebuild and record a new manifest");
  if (artifacts.sha256 !== manifest.artifacts.sha256) throw new Error("Production artifacts changed after release manifest recording");
  return { buildId: paths.buildId, sourceSha256: source.sha256, artifactSha256: artifacts.sha256, manifest: relative(root, paths.manifest) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (!["--record", "--verify"].includes(command)) throw new Error("Use --record immediately after a build, or --verify before integration");
  const result = command === "--record" ? await recordReleaseManifest() : await verifyReleaseManifest();
  console.log(JSON.stringify(result));
}
