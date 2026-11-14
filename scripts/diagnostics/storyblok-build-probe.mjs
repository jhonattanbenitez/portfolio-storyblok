/** Optional local build instrumentation. Logs counts/statuses, never CDA URLs,
 * headers, credentials or response bodies. Load before Next with --import. */
import { appendFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { threadId } from "node:worker_threads";
import { channel } from "node:diagnostics_channel";

export function cdaRequestIdentity(input) {
  let url;
  try { url = new URL(typeof input === "string" || input instanceof URL ? input : input.url); }
  catch { return null; }
  if (url.hostname !== "api-us.storyblok.com" || !url.pathname.startsWith("/v2/cdn/")) return null;
  // Canonical signature omits credentials entirely; no token-derived digest.
  const params = [...url.searchParams.entries()].filter(([key]) => !/token|secret|password|auth|cookie|signature|key/i.test(key))
    .sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
  const fingerprint = createHash("sha256").update(JSON.stringify([url.pathname, params])).digest("hex");
  const requestedVersion = url.searchParams.get("version");
  const requestedLocale = url.searchParams.get("language");
  return {
    fingerprint,
    endpoint: /^\/v2\/cdn\/stories\/?$/.test(url.pathname) ? "stories" : /^\/v2\/cdn\/links\/?$/.test(url.pathname) ? "links" : "story",
    version: ["published", "draft"].includes(requestedVersion) ? requestedVersion : "other",
    locale: ["en", "es-co", "es_co"].includes(requestedLocale) ? requestedLocale : requestedLocale ? "other" : "default",
  };
}

export function createBuildProbe({ fetchImpl, writeEvent, now = Date.now, processId = process.pid, workerId = threadId, fault429 = false }) {
  let active = 0, sequence = 0;
  return async function probedFetch(input, init) {
    const identity = cdaRequestIdentity(input);
    if (!identity) return fetchImpl(input, init);
    const sequenceId = ++sequence, started = now();
    active++;
    writeEvent({ event: "start", pid: processId, worker: workerId, sequence: sequenceId, at: started, active, ...identity });
    try {
      const response = fault429
        ? Response.json({ error: "LOCAL_DIAGNOSTIC_RATE_LIMIT" }, { status: 429, headers: { "retry-after": "120" } })
        : await fetchImpl(input, init);
      const retryAfter = response.headers.get("retry-after");
      let retryAfterMs = null;
      if (retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter.trim())) retryAfterMs = Math.min(Number(retryAfter) * 1000, 86400000);
      else if (retryAfter && Number.isFinite(Date.parse(retryAfter))) retryAfterMs = Math.min(Math.max(0, Date.parse(retryAfter) - now()), 86400000);
      writeEvent({ event: "response", pid: processId, worker: workerId, sequence: sequenceId, at: now(), durationMs: now() - started,
        status: response.status, retryAfterMs, ...identity });
      return response;
    } catch (error) {
      // Only a controlled classification; native errors can include private URLs.
      writeEvent({ event: "failure", pid: processId, worker: workerId, sequence: sequenceId, at: now(), durationMs: now() - started,
        failure: error?.name === "AbortError" || error?.name === "TimeoutError" ? "timeout-or-abort" : "network", ...identity });
      throw error;
    } finally {
      active--;
      writeEvent({ event: "end", pid: processId, worker: workerId, sequence: sequenceId, at: now(), active, ...identity });
    }
  };
}

export function installCdaWireProbe({ writeEvent, now = Date.now, processId = process.pid, workerId = threadId }) {
  const requests = new WeakMap(); let sequence = 0, active = 0;
  const create = ({ request }) => {
    const identity = cdaRequestIdentity(String(request.origin) + request.path);
    if (!identity) return;
    const record = { ...identity, sequence: ++sequence, started: now() };
    requests.set(request, record); active++;
    writeEvent({ event: "wire-start", pid: processId, worker: workerId, sequence: record.sequence, at: record.started, active, ...identity });
  };
  const finish = (kind, message) => {
    const record = requests.get(message.request); if (!record) return;
    requests.delete(message.request); active--;
    writeEvent({ event: kind, pid: processId, worker: workerId, sequence: record.sequence, at: now(), durationMs: now() - record.started,
      active, status: kind === "wire-response" ? message.response.statusCode : undefined, fingerprint: record.fingerprint,
      endpoint: record.endpoint, version: record.version, locale: record.locale });
  };
  const headers = message => finish("wire-response", message), error = message => finish("wire-failure", message);
  channel("undici:request:create").subscribe(create);
  channel("undici:request:headers").subscribe(headers);
  channel("undici:request:error").subscribe(error);
  return () => {
    channel("undici:request:create").unsubscribe(create); channel("undici:request:headers").unsubscribe(headers); channel("undici:request:error").unsubscribe(error);
  };
}

const directory = process.env.STORYBLOK_BUILD_PROBE_DIR;
if (directory) {
  const key = Symbol.for("portfolio.storyblok-build-probe");
  if (!globalThis[key]) {
    const output = resolve(directory);
    mkdirSync(output, { recursive: true, mode: 0o700 });
    const file = resolve(output, `requests-${process.pid}-${threadId}.jsonl`);
    const writeEvent = event => appendFileSync(file, JSON.stringify(event) + "\n", { mode: 0o600 });
    installCdaWireProbe({ writeEvent });
    globalThis.fetch = createBuildProbe({ fetchImpl: globalThis.fetch.bind(globalThis), fault429: process.env.STORYBLOK_BUILD_PROBE_FAULT === "OFFLINE_INJECT_429", writeEvent });
    globalThis[key] = true;
  }
}
