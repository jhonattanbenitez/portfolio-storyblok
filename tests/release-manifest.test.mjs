import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { artifactFingerprint } from "../scripts/release-validation-manifest.mjs";

test("release evidence allows only runtime route-cache drift and detects executable/static tampering", async () => {
  const root = await mkdtemp(join(tmpdir(), "portfolio-artifact-test-"));
  const files = ["BUILD_ID", "build-manifest.json", "prerender-manifest.json", "required-server-files.json", "server/app/page.js", "server/app/sitemap.xml.body", "static/chunks/fixture.js"];
  try {
    for (const file of files) {
      const path = join(root, ".next", file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `original-${file}`);
    }
    const baseline = await artifactFingerprint(root);
    const runtimeCache = join(root, ".next/server/route-cache/APP_ROUTE/synthetic/$/sitemap.xml.body");
    await mkdir(dirname(runtimeCache), { recursive: true });
    await writeFile(runtimeCache, "mutable runtime cache");
    assert.deepEqual(await artifactFingerprint(root), baseline);
    await writeFile(runtimeCache, "regenerated runtime cache");
    assert.deepEqual(await artifactFingerprint(root), baseline);
    for (const file of ["server/app/page.js", "static/chunks/fixture.js", "server/app/sitemap.xml.body"]) {
      const path = join(root, ".next", file);
      await writeFile(path, "unexpected artifact change");
      assert.notEqual((await artifactFingerprint(root)).sha256, baseline.sha256, file);
      await writeFile(path, `original-${file}`);
      assert.deepEqual(await artifactFingerprint(root), baseline);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
