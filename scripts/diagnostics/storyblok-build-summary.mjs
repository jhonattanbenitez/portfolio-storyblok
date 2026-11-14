/** Summarize the optional sanitized preload records from one isolated build. */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

function peakStarts(starts) {
  const values = starts.map(row => row.at).sort((a, b) => a - b); let left = 0, peak = 0;
  for (let right = 0; right < values.length; right++) { while (values[right] - values[left] >= 1000) left++; peak = Math.max(peak, right - left + 1); }
  return peak;
}
function rateSummary(starts) {
  const workers = new Map();
  for (const row of starts) { const key = `${row.pid}:${row.worker}`, values = workers.get(key) || []; values.push(row); workers.set(key, values); }
  return { maxStartsInOneSecond: peakStarts(starts), perWorker: [...workers].map(([worker, rows]) => {
    const values = rows.map(row => row.at).sort((a, b) => a - b);
    return { worker, maxStartsInOneSecond: peakStarts(rows), minInterStartMs: values.length > 1 ? Math.min(...values.slice(1).map((value, index) => value - values[index])) : null };
  }) };
}
export function summarizeCdaProbe(events) {
  const starts = events.filter(row => row.event === "start"), responses = events.filter(row => row.event === "response"), failures = events.filter(row => row.event === "failure");
  const signatures = new Map();
  for (const event of [...responses, ...failures].sort((a, b) => a.at - b.at)) {
    const records = signatures.get(event.fingerprint) || [];
    records.push(event); signatures.set(event.fingerprint, records);
  }
  const timestamps = events.filter(row => row.event === "start" || row.event === "end").sort((a, b) => a.at - b.at || (a.event === b.event ? 0 : a.event === "start" ? -1 : 1));
  let active = 0, peakCrossProcessHeaders = 0;
  for (const row of timestamps) { active += row.event === "start" ? 1 : -1; peakCrossProcessHeaders = Math.max(peakCrossProcessHeaders, active); }
  const repeated = [...signatures.values()].filter(rows => rows.length > 1).length;
  const unresolved429Signatures = [...signatures].filter(([, records]) => records.some(row => row.status === 429) && records.at(-1)?.status !== 200).map(([signature]) => signature);
  return {
    attempts: starts.length, responses: responses.length, networkFailures: failures.length,
    nativeFetchRate: rateSummary(starts),
    wire: {
      requests: events.filter(row => row.event === "wire-start").length,
      statuses: Object.fromEntries([...new Set(events.filter(row => row.event === "wire-response").map(row => row.status))].sort().map(status => [status, events.filter(row => row.event === "wire-response" && row.status === status).length])),
      failures: events.filter(row => row.event === "wire-failure").length,
      rate: rateSummary(events.filter(row => row.event === "wire-start")),
      source: "Node undici diagnostics channels; includes native HTTP redirect hops when the runtime exposes these channels.",
    },
    statuses: Object.fromEntries([...new Set(responses.map(row => row.status))].sort().map(status => [status, responses.filter(row => row.status === status).length])),
    uniqueSignatures: signatures.size, repeatedSignatures: repeated,
    attemptsBeyondUniqueSignatures: starts.length - signatures.size,
    processCount: new Set(starts.map(row => row.pid)).size,
    workerCount: new Set(starts.map(row => `${row.pid}:${row.worker}`)).size,
    maxNativeFetchConcurrencyPerWorker: Math.max(0, ...starts.map(row => row.active)),
    peakCrossProcessHeaders,
    unfinishedAttempts: starts.length - responses.length - failures.length,
    unresolved429Signatures,
    limits: [
      "Counts native fetch attempts observed below Next cache; not every logical loader invocation.",
      "Concurrency ends at fetch response headers, not at body consumption; equal-millisecond boundaries conservatively count starts before ends.",
      "Repeated signatures include retries and separate render workers; no credential-derived identity is logged.",
      "Unresolved429Signatures uses final observed outcome per signature. Combine with fail-closed build status; it is not a per-caller retry guarantee.",
    ],
  };
}

async function main() {
  const directory = resolve(process.argv[2] || "");
  if (!process.argv[2]) throw new Error("Usage: node scripts/diagnostics/storyblok-build-summary.mjs <probe-directory> [output.json]");
  const filenames = (await readdir(directory)).filter(name => /^requests-\d+-\d+\.jsonl$/.test(name));
  const records = [];
  for (const name of filenames) {
    for (const line of (await readFile(join(directory, name), "utf8")).split("\n").filter(Boolean)) records.push(JSON.parse(line));
  }
  const summary = summarizeCdaProbe(records);
  if (process.argv[3]) await writeFile(resolve(process.argv[3]), JSON.stringify(summary, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.attempts || summary.unresolved429Signatures.length || summary.unfinishedAttempts) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
