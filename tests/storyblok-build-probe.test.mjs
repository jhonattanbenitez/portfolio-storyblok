import assert from "node:assert/strict";
import test from "node:test";
import { cdaRequestIdentity, createBuildProbe } from "../scripts/diagnostics/storyblok-build-probe.mjs";

test("build probe identities exclude credentials and canonicalize parameter order", () => {
  const a = cdaRequestIdentity("https://api-us.storyblok.com/v2/cdn/stories/home?token=private-a&version=published&language=es-co");
  const b = cdaRequestIdentity("https://api-us.storyblok.com/v2/cdn/stories/home?language=es-co&version=published&token=private-b");
  assert.deepEqual(a, b);
  assert.equal(a.endpoint, "story");
  assert.equal(cdaRequestIdentity("https://example.invalid/v2/cdn/stories?token=private"), null);
  assert.equal(cdaRequestIdentity("https://api-us.storyblok.com/v1/spaces/1"), null);
  assert.equal(cdaRequestIdentity("invalid"), null);
  assert.ok(!JSON.stringify(a).includes("home"));
});

test("build probe records real attempt concurrency and statuses without leaking private data", async () => {
  const events = [], pending = [];
  const fetchImpl = () => new Promise(resolve => pending.push(resolve));
  const probe = createBuildProbe({ fetchImpl, writeEvent: row => events.push(row), now: () => 1000, processId: 1, workerId: 2 });
  const first = probe("https://api-us.storyblok.com/v2/cdn/stories/home?version=draft&token=DO-NOT-LOG");
  const second = probe("https://api-us.storyblok.com/v2/cdn/links?version=published&token=DO-NOT-LOG");
  assert.deepEqual(events.filter(e => e.event === "start").map(e => e.active), [1, 2]);
  pending[0](new Response(null, { status: 429, headers: { "retry-after": "2" } }));
  pending[1](Response.json({ stories: [], private: "NOT-TO-BE-RECORDED" }));
  await Promise.all([first, second]);
  assert.deepEqual(events.filter(e => e.event === "response").map(e => e.status), [429, 200]);
  assert.equal(events.find(e => e.status === 429).retryAfterMs, 2000);
  assert.equal(events.at(-1).active, 0);
  for (const secret of ["DO-NOT-LOG", "NOT-TO-BE-RECORDED", "https://", "token="]) assert.ok(!JSON.stringify(events).includes(secret));
});

test("build probe preserves failure and exposes only a fixed failure classification", async () => {
  const events = [], error = new Error("https://private.invalid/?token=DO-NOT-LOG");
  const probe = createBuildProbe({ fetchImpl: async () => { throw error; }, writeEvent: row => events.push(row) });
  await assert.rejects(probe("https://api-us.storyblok.com/v2/cdn/stories?version=draft&token=DO-NOT-LOG"), candidate => candidate === error);
  assert.equal(events.find(e => e.event === "failure").failure, "network");
  assert.ok(!JSON.stringify(events).includes("DO-NOT-LOG"));
  assert.equal(events.at(-1).active, 0);
});

test("offline injected429 probe cannot reach the real CDA provider and preserves Retry-After", async () => {
  const events = []; let nativeCalls = 0;
  const probe = createBuildProbe({ fetchImpl: async () => { nativeCalls++; throw new Error("REAL_PROVIDER_MUST_NOT_BE_CALLED"); },
    writeEvent: row => events.push(row), fault429: true });
  const response = await probe("https://api-us.storyblok.com/v2/cdn/stories?version=published&token=not-a-real-credential");
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "120");
  assert.equal(nativeCalls, 0);
  assert.equal(events.find(row => row.event === "response").retryAfterMs, 120000);
  assert.ok(!JSON.stringify(events).includes("not-a-real-credential"));
});

test("build probe summary counts cross-worker overlap and unresolved429 without raw URLs", async () => {
  const { summarizeCdaProbe } = await import("../scripts/diagnostics/storyblok-build-summary.mjs");
  const events = [
    { event: "start", at: 0, pid: 1, worker: 0, sequence: 1, fingerprint: "a", active: 1 },
    { event: "start", at: 1, pid: 2, worker: 0, sequence: 1, fingerprint: "b", active: 1 },
    { event: "response", at: 2, pid: 1, worker: 0, sequence: 1, fingerprint: "a", status: 429 },
    { event: "end", at: 2, pid: 1, worker: 0, sequence: 1, fingerprint: "a", active: 0 },
    { event: "response", at: 3, pid: 2, worker: 0, sequence: 1, fingerprint: "b", status: 200 },
    { event: "end", at: 3, pid: 2, worker: 0, sequence: 1, fingerprint: "b", active: 0 },
  ];
  const summary = summarizeCdaProbe(events);
  assert.equal(summary.attempts, 2);
  assert.equal(summary.peakCrossProcessHeaders, 2);
  assert.equal(summary.processCount, 2);
  assert.deepEqual(summary.unresolved429Signatures, ["a"]);
});

test("wire diagnostics count redirects separately and never record URLs, headers or error text", async () => {
  const { installCdaWireProbe } = await import("../scripts/diagnostics/storyblok-build-probe.mjs");
  const { channel } = await import("node:diagnostics_channel");
  const events = [], stop = installCdaWireProbe({ writeEvent: row => events.push(row), now: () => 1000, processId: 999, workerId: 99 });
  try {
    for (const statusCode of [301, 200]) {
      const request = { origin: "https://api-us.storyblok.com", path: "/v2/cdn/stories/home?version=published&token=DO-NOT-LOG", headers: "Authorization: NEVER-LOG" };
      channel("undici:request:create").publish({ request });
      channel("undici:request:headers").publish({ request, response: { statusCode, headers: ["NEVER-LOG"] } });
    }
    const request = { origin: "https://api-us.storyblok.com", path: "/v2/cdn/links?token=DO-NOT-LOG" };
    channel("undici:request:create").publish({ request });
    channel("undici:request:error").publish({ request, error: new Error("token=DO-NOT-LOG") });
    assert.deepEqual(events.filter(row => row.event === "wire-response").map(row => row.status), [301, 200]);
    assert.equal(events.filter(row => row.event === "wire-failure").length, 1);
    for (const secret of ["DO-NOT-LOG", "NEVER-LOG", "https://", "token="]) assert.ok(!JSON.stringify(events).includes(secret));
  } finally { stop(); }
});
