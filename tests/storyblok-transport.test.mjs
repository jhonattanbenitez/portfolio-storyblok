import assert from "node:assert/strict";
import test from "node:test";
import { createStoryblokTransport, storyblokRetryAfterMs, StoryblokDataError } from "../lib/storyblok-transport.ts";

const published = { version: "published", fetchOptions: { cache: "force-cache", next: { revalidate: 3600, tags: ["cms", "story:home"] } } };
const url = "https://api-us.storyblok.com/v2/cdn/stories/home?token=private-test-value&version=published";
function virtual(options = {}) {
  let time = Date.UTC(2026, 10, 13);
  const waits = [];
  const transport = createStoryblokTransport({ minStartIntervalMs: 0, now: () => time,
    // Simulate an asynchronous timer, not a synchronous clock jump before the
    // first admitted request has had a chance to start in its microtask.
    sleep: async milliseconds => { waits.push(milliseconds); await new Promise(resolve => setImmediate(resolve)); time += milliseconds; }, random: () => 0, ...options });
  return { transport, waits, now: () => time };
}
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test("Retry-After accepts seconds and HTTP dates, rejects malformed or unsafe values", () => {
  const now = Date.UTC(2026, 10, 13);
  assert.equal(storyblokRetryAfterMs("2", now), 2000);
  assert.equal(storyblokRetryAfterMs("0.25", now), 250);
  assert.equal(storyblokRetryAfterMs(new Date(now + 3000).toUTCString(), now), 3000);
  assert.equal(storyblokRetryAfterMs(new Date(now - 3000).toUTCString(), now), 0);
  for (const value of [null, "", "-1", "tomorrow", "NaN", "Infinity", "1e100"]) assert.equal(storyblokRetryAfterMs(value, now), null);
});

test("429 recovery respects Retry-After seconds and preserves cache options", async () => {
  const clock = virtual(); let calls = 0;
  const result = await clock.transport.request(url, { ...published, fetchImpl: async (_url, options) => {
    assert.equal(options.cache, "force-cache"); assert.equal(options.next.revalidate, 3600);
    assert.deepEqual(options.next.tags, ["cms", "story:home"]); assert.ok(options.signal instanceof AbortSignal);
    return ++calls === 1 ? new Response(null, { status: 429, headers: { "Retry-After": "2" } }) : Response.json({ value: "recovered" });
  } });
  assert.deepEqual(result, { value: "recovered" }); assert.equal(calls, 2); assert.deepEqual(clock.waits, [2000]);
});

test("Retry-After HTTP date is a minimum even when local backoff is shorter", async () => {
  const clock = virtual(); let calls = 0;
  const date = new Date(clock.now() + 4000).toUTCString();
  await clock.transport.request(url, { ...published, fetchImpl: async () => ++calls === 1
    ? new Response(null, { status: 429, headers: { "Retry-After": date } }) : Response.json({ ok: true }) });
  assert.deepEqual(clock.waits, [4000]); assert.equal(calls, 2);
});

test("Retry-After outside the bounded wait budget fails without retrying early", async () => {
  const clock = virtual(); let calls = 0;
  await assert.rejects(clock.transport.request(url, { ...published, fetchImpl: async () => {
    calls++; return new Response(null, { status: 429, headers: { "Retry-After": "3600" } });
  } }), error => error.status === 429);
  assert.equal(calls, 1); assert.deepEqual(clock.waits, []);
});

test("5xx retries stop after four attempts with bounded exponential backoff", async () => {
  const clock = virtual(); let calls = 0;
  await assert.rejects(clock.transport.request(url, { ...published, fetchImpl: async () => { calls++; return new Response(null, { status: 503 }); } }), error => error.status === 503);
  assert.equal(calls, 4); assert.deepEqual(clock.waits, [500, 1000, 2000]);
});

test("transient network errors recover without retaining an authenticated exception", async () => {
  const clock = virtual(); let calls = 0;
  const result = await clock.transport.request(url, { ...published, fetchImpl: async () => {
    if (++calls === 1) throw new Error("private-test-value " + url);
    return Response.json({ ok: true });
  } });
  assert.deepEqual(result, { ok: true }); assert.equal(calls, 2);
});

test("404 is not retried or converted to a transient error, and statusText is not exposed", async () => {
  const clock = virtual(); let calls = 0;
  await assert.rejects(clock.transport.request(url, { ...published, fetchImpl: async () => {
    calls++; return new Response(null, { status: 404, statusText: "private-test-value" });
  } }), error => error instanceof StoryblokDataError && error.status === 404 && !error.message.includes("private-test-value"));
  assert.equal(calls, 1); assert.deepEqual(clock.waits, []);
});

test("exhausted network errors do not expose URL, token, message or cause", async () => {
  const clock = virtual({ maxAttempts: 1 });
  await assert.rejects(clock.transport.request(url, { ...published, fetchImpl: async () => { throw new Error(url); } }), error => {
    assert.equal(error.message, "Storyblok request failed"); assert.equal(error.cause, undefined);
    assert.equal(error.status, undefined); return true;
  });
});

test("invalid JSON is not cached, retried or accepted as an empty response", async () => {
  const clock = virtual(); let calls = 0;
  await assert.rejects(clock.transport.request(url, { ...published, fetchImpl: async () => { calls++; return new Response("not json"); } }), error => error.code === "INVALID_RESPONSE");
  assert.equal(calls, 1);
});

test("attempt timeout includes body decoding, aborts and releases its permit", async () => {
  const transport = createStoryblokTransport({ minStartIntervalMs: 0, attemptTimeoutMs: 10, maxAttempts: 1 }); let aborted = 0;
  await assert.rejects(transport.request(url, { ...published, fetchImpl: async (_url, options) => {
    options.signal.addEventListener("abort", () => aborted++);
    return { ok: true, json: () => new Promise(() => {}) };
  } }), error => error.code === "TIMEOUT");
  assert.equal(aborted, 1);
  assert.deepEqual(await transport.request(url, { ...published, fetchImpl: async () => Response.json({ ok: true }) }), { ok: true });
});

test("identical published concurrent work is coalesced and each caller gets an independent value", async () => {
  const clock = virtual(); const gate = deferred(); let calls = 0;
  const fetchImpl = async () => { calls++; await gate.promise; return Response.json({ story: { title: "Original" } }); };
  const a = clock.transport.request(url, { ...published, fetchImpl }), b = clock.transport.request(url, { ...published, fetchImpl });
  await Promise.resolve(); gate.resolve(); const [one, two] = await Promise.all([a, b]);
  assert.equal(calls, 1); one.story.title = "Mutated"; assert.equal(two.story.title, "Original");
  await clock.transport.request(url, { ...published, fetchImpl }); assert.equal(calls, 2, "No durable extra success cache may outlive revalidation");
});

test("rejected published flights are removed and a later request can recover", async () => {
  const clock = virtual({ maxAttempts: 1 }); let calls = 0; const gate = deferred();
  const fetchImpl = async () => { calls++; if (calls === 1) { await gate.promise; return new Response(null, { status: 503 }); } return Response.json({ ok: true }); };
  const requests = [clock.transport.request(url, { ...published, fetchImpl }), clock.transport.request(url, { ...published, fetchImpl })];
  gate.resolve(); assert.ok((await Promise.allSettled(requests)).every(result => result.status === "rejected")); assert.equal(calls, 1);
  assert.deepEqual(await clock.transport.request(url, { ...published, fetchImpl }), { ok: true }); assert.equal(calls, 2);
});

test("credentials, locale, tags, headers and fetch implementation partition published flights", async () => {
  const clock = virtual({ maxConcurrent: 10 }); const gate = deferred(); let calls = 0;
  const fetchImpl = async () => { calls++; await gate.promise; return Response.json({ ok: true }); };
  const alternateFetch = async (...args) => fetchImpl(...args);
  const requests = [
    clock.transport.request(url, { ...published, fetchImpl }),
    clock.transport.request(url.replace("private-test-value", "other-token"), { ...published, fetchImpl }),
    clock.transport.request(url + "&language=es-co", { ...published, fetchImpl }),
    clock.transport.request(url, { ...published, fetchImpl, fetchOptions: { ...published.fetchOptions, next: { revalidate: 3600, tags: ["cms", "different-tag"] } } }),
    clock.transport.request(url, { ...published, fetchImpl: alternateFetch }),
    clock.transport.request(url, { ...published, fetchImpl, fetchOptions: { ...published.fetchOptions, headers: { "X-Transport-Test": "different" } } }),
  ];
  gate.resolve(); await Promise.all(requests); assert.equal(calls, 6);
});

test("draft is never shared or cached and remains no-store", async () => {
  const clock = virtual(); const gate = deferred(); let calls = 0;
  const fetchImpl = async (_url, options) => { calls++; assert.equal(options.cache, "no-store"); assert.equal(options.next, undefined); await gate.promise; return Response.json({ sequence: calls }); };
  const options = { version: "draft", fetchOptions: { cache: "no-store" }, fetchImpl };
  const requests = [clock.transport.request(url, options), clock.transport.request(url, options)]; gate.resolve(); await Promise.all(requests);
  assert.equal(calls, 2); await clock.transport.request(url, options); assert.equal(calls, 3);
});

test("one process-wide limiter bounds unrelated simultaneous requests, not merely a single UUID batch", async () => {
  const transport = createStoryblokTransport({ minStartIntervalMs: 0, maxConcurrent: 2 }); const gates = Array.from({ length: 7 }, deferred);
  let calls = 0, active = 0, peak = 0;
  const fetchImpl = async () => { const index = calls++; active++; peak = Math.max(peak, active); await gates[index].promise; active--; return Response.json({ index }); };
  const requests = Array.from({ length: 7 }, (_, index) => transport.request(url + "&different=" + index, { ...published, fetchImpl }));
  await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 2);
  for (const gate of gates) { gate.resolve(); await new Promise(resolve => setImmediate(resolve)); }
  await Promise.all(requests); assert.equal(calls, 7); assert.equal(peak, 2);
});

test("a queued request has its own total deadline and never starts after timeout", async () => {
  const transport = createStoryblokTransport({ minStartIntervalMs: 0, maxConcurrent: 1, totalTimeoutMs: 20, attemptTimeoutMs: 100, maxAttempts: 1 }); let calls = 0;
  const fetchImpl = async () => { calls++; return new Promise(() => {}); };
  const outcomes = await Promise.allSettled([transport.request(url, { ...published, fetchImpl }), transport.request(url + "&queued=1", { ...published, fetchImpl })]);
  assert.ok(outcomes.every(outcome => outcome.status === "rejected" && outcome.reason.code === "TIMEOUT"));
  assert.equal(calls, 1);
});

test("the shared start interval applies across different endpoints", async () => {
  const clock = virtual({ minStartIntervalMs: 250, maxConcurrent: 2 }); const starts = [];
  const fetchImpl = async requested => { starts.push({ requested, time: clock.now() }); return Response.json({ ok: true }); };
  await Promise.all(Array.from({ length: 5 }, (_, index) => clock.transport.request(url + "&endpoint=" + index, { ...published, fetchImpl })));
  assert.equal(starts.length, 5);
  for (let index = 1; index < starts.length; index++) assert.ok(starts[index].time - starts[index - 1].time >= 250);
});

test("a retry re-enters the same limiter instead of bypassing an active unrelated request", async () => {
  const clock = virtual({ maxConcurrent: 1 }); const retryReady = deferred(), backoff = deferred(), otherStarted = deferred(), other = deferred();
  let aCalls = 0, bCalls = 0;
  const fetchImpl = async requested => {
    if (requested.endsWith("&other=1")) { bCalls++; otherStarted.resolve(); await other.promise; return Response.json({ other: true }); }
    return ++aCalls === 1 ? new Response(null, { status: 503 }) : Response.json({ recovered: true });
  };
  const a = clock.transport.request(url, { ...published, fetchImpl, sleep: async () => { retryReady.resolve(); await backoff.promise; } });
  await retryReady.promise;
  const b = clock.transport.request(url + "&other=1", { ...published, fetchImpl }); await otherStarted.promise;
  backoff.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(aCalls, 1, "Retry must remain queued while the unrelated request owns the permit");
  other.resolve(); const result = await Promise.all([a, b]);
  assert.equal(aCalls, 2); assert.equal(bCalls, 1); assert.deepEqual(result, [{ recovered: true }, { other: true }]);
});

test("a 429 cooldown also delays another queued endpoint", async () => {
  const clock = virtual({ maxConcurrent: 1 }); const starts = []; let originalCalls = 0;
  const fetchImpl = async requested => {
    starts.push({ requested, time: clock.now() });
    return !requested.endsWith("&other=1") && ++originalCalls === 1
      ? new Response(null, { status: 429, headers: { "Retry-After": "2" } }) : Response.json({ ok: true });
  };
  await Promise.all([clock.transport.request(url, { ...published, fetchImpl }), clock.transport.request(url + "&other=1", { ...published, fetchImpl })]);
  assert.equal(starts.length, 3);
  assert.ok(starts.find(start => start.requested.endsWith("&other=1")).time - starts[0].time >= 2000);
  assert.ok(starts.slice(1).every(start => start.time - starts[0].time >= 2000));
});

test("a provider cooldown beyond the total budget rejects queued work without sending it early", async () => {
  const clock = virtual({ maxConcurrent: 1 }); let calls = 0;
  const fetchImpl = async () => { calls++; return new Response(null, { status: 429, headers: { "Retry-After": "3600" } }); };
  const results = await Promise.allSettled([clock.transport.request(url, { ...published, fetchImpl }), clock.transport.request(url + "&other=1", { ...published, fetchImpl })]);
  assert.equal(results[0].reason.status, 429); assert.equal(results[1].reason.code, "TIMEOUT");
  assert.equal(calls, 1); assert.deepEqual(clock.waits, []);
});

test("the waiting queue is bounded and does not discard work that was admitted", async () => {
  const clock = virtual({ maxConcurrent: 1, maxQueued: 1 }); const gate = deferred(), started = deferred(); let calls = 0;
  const fetchImpl = async () => { calls++; started.resolve(); await gate.promise; return Response.json({ ok: true }); };
  const first = clock.transport.request(url, { ...published, fetchImpl }); await started.promise;
  const second = clock.transport.request(url + "&queued=1", { ...published, fetchImpl });
  await assert.rejects(clock.transport.request(url + "&queued=2", { ...published, fetchImpl }), error => error.code === "QUEUE_FULL");
  gate.resolve(); await Promise.all([first, second]); assert.equal(calls, 2);
});
