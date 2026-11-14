import { createHash } from "node:crypto";

export class StoryblokDataError extends Error {
  readonly code: "MISSING_TOKEN" | "REQUEST_FAILED" | "INVALID_RESPONSE" | "INVALID_REQUEST" | "TIMEOUT" | "QUEUE_FULL";
  readonly status?: number;

  constructor(message: string, code: StoryblokDataError["code"], status?: number) {
    super(message);
    this.name = "StoryblokDataError";
    this.code = code;
    this.status = status;
  }
}

type FetchOptions = RequestInit & { next?: { revalidate?: number; tags: string[] } };
type TransportOptions = {
  maxConcurrent?: number;
  minStartIntervalMs?: number;
  attemptTimeoutMs?: number;
  totalTimeoutMs?: number;
  maxAttempts?: number;
  maxRetryWaitMs?: number;
  maxQueued?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
};
type RequestOptions = {
  version: "published" | "draft";
  fetchOptions: FetchOptions;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
};

const defaultSleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/** Return the provider's minimum delay; never shorten a valid Retry-After. */
export function storyblokRetryAfterMs(value: string | null, now = Date.now()): number | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const milliseconds = Number(trimmed) * 1000;
    return Number.isFinite(milliseconds) ? Math.ceil(milliseconds) : null;
  }
  // Date.parse accepts non-HTTP values such as "-1". Reject those first.
  if (!/^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT$/.test(trimmed)) return null;
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null;
}

/**
 * Per-process backpressure, not a distributed quota. The Next fetch cache owns
 * persistence and tag invalidation. Only identical published work currently in
 * flight is shared; draft values are never shared or retained here.
 */
export function createStoryblokTransport({
  maxConcurrent = 2, minStartIntervalMs = 250, attemptTimeoutMs = 8000,
  totalTimeoutMs = 30_000, maxAttempts = 4, maxRetryWaitMs = 10_000,
  maxQueued = 128, now = Date.now, sleep = defaultSleep, random = Math.random,
}: TransportOptions = {}) {
  for (const value of [maxConcurrent, attemptTimeoutMs, totalTimeoutMs, maxAttempts, maxRetryWaitMs, maxQueued]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid CDA transport limit");
  }
  if (!Number.isSafeInteger(minStartIntervalMs) || minStartIntervalMs < 0) throw new Error("Invalid CDA transport interval");
  const flights = new Map<string, Promise<unknown>>();
  const fetchIds = new WeakMap<typeof fetch, number>();
  let nextFetchId = 0, active = 0, nextStart = 0, cooldownUntil = 0, pumping = false;
  type Waiter = { deadline: number; settled: boolean; timer?: ReturnType<typeof setTimeout>; resolve: (release: () => void) => void; reject: (error: Error) => void };
  const queue: Waiter[] = [];
  const timeoutError = () => new StoryblokDataError("Storyblok request timed out", "TIMEOUT");

  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      while (active < maxConcurrent && queue.length) {
        const waiter = queue.shift()!;
        if (waiter.settled) continue;
        const delay = Math.max(0, nextStart - now(), cooldownUntil - now());
        if (now() + delay >= waiter.deadline) { waiter.settled = true; clearTimeout(waiter.timer); waiter.reject(timeoutError()); continue; }
        if (delay) await sleep(delay);
        if (waiter.settled) continue;
        // A 429 from another active request can extend the shared cooldown.
        if (now() < Math.max(nextStart, cooldownUntil)) { queue.unshift(waiter); continue; }
        if (now() >= waiter.deadline) { waiter.settled = true; clearTimeout(waiter.timer); waiter.reject(timeoutError()); continue; }
        waiter.settled = true;
        clearTimeout(waiter.timer);
        active++;
        nextStart = now() + minStartIntervalMs;
        let released = false;
        waiter.resolve(() => {
          if (released) return;
          released = true;
          active--;
          void pump();
        });
      }
    } finally { pumping = false; }
  }

  async function acquire(deadline: number): Promise<() => void> {
    if (queue.length >= maxQueued) throw new StoryblokDataError("Storyblok request queue is full", "QUEUE_FULL");
    return new Promise((resolve, reject) => {
      const waiter: Waiter = { deadline, resolve, reject, settled: false };
      waiter.timer = setTimeout(() => {
        waiter.settled = true;
        const index = queue.indexOf(waiter);
        if (index >= 0) queue.splice(index, 1);
        reject(timeoutError());
      }, Math.max(1, deadline - now()));
      queue.push(waiter);
      void pump();
    });
  }

  async function execute(url: string, options: RequestOptions): Promise<unknown> {
    const fetchImpl = options.fetchImpl ?? fetch;
    const retrySleep = options.sleep ?? sleep, retryRandom = options.random ?? random;
    const deadline = now() + totalTimeoutMs;
    let lastError = new StoryblokDataError("Storyblok request failed", "REQUEST_FAILED");
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (now() >= deadline) throw lastError;
      const release = await acquire(deadline);
      let retryAfter: number | null = null;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          (async () => {
            const response = await fetchImpl(url, { ...options.fetchOptions, signal: controller.signal });
            if (response.ok) {
              try { return { value: await response.json(), success: true as const }; }
              catch (error) {
                if (error instanceof SyntaxError) throw new StoryblokDataError("Invalid Storyblok response", "INVALID_RESPONSE");
                throw error;
              }
            }
            retryAfter = storyblokRetryAfterMs(response.headers.get("Retry-After"), now());
            if (response.status === 429 && retryAfter !== null) cooldownUntil = Math.max(cooldownUntil, now() + retryAfter);
            await response.body?.cancel();
            return { status: response.status, success: false as const };
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => { controller.abort(); reject(timeoutError()); }, Math.min(attemptTimeoutMs, Math.max(1, deadline - now())));
          }),
        ]);
        if (result.success) return result.value;
        lastError = new StoryblokDataError(`Storyblok request failed (${result.status})`, "REQUEST_FAILED", result.status);
        if (result.status !== 429 && result.status < 500) throw lastError;
      } catch (error) {
        if (error instanceof StoryblokDataError) {
          if (error.code === "INVALID_RESPONSE" || (error.status && error.status < 500 && error.status !== 429)) throw error;
          lastError = error;
        } else {
          // Provider/network messages may embed the authenticated URL. No cause,
          // statusText, headers or external exception strings enter our errors.
          lastError = new StoryblokDataError("Storyblok request failed", "REQUEST_FAILED");
        }
      } finally {
        if (timer) clearTimeout(timer);
        release();
      }
      if (attempt === maxAttempts - 1) break;
      const sample = retryRandom();
      const jitter = Math.round(Math.min(1, Math.max(0, Number.isFinite(sample) ? sample : 0)) * 250);
      const delay = Math.max(500 * 2 ** attempt + jitter, retryAfter ?? 0);
      // Refuse a provider delay outside our bounded budget; retrying sooner
      // would violate Retry-After, and sleeping indefinitely would hide a failure.
      if (delay > maxRetryWaitMs || now() + delay >= deadline) break;
      await retrySleep(delay);
    }
    throw lastError;
  }

  return {
    async request<T>(url: string, options: RequestOptions): Promise<T> {
      if ((options.fetchOptions.method && options.fetchOptions.method !== "GET") || options.fetchOptions.body != null) {
        throw new StoryblokDataError("Invalid Storyblok request options", "INVALID_REQUEST");
      }
      if (options.version === "draft") return structuredClone(await execute(url, options)) as T;
      const fetchImpl = options.fetchImpl ?? fetch;
      if (!fetchIds.has(fetchImpl)) fetchIds.set(fetchImpl, ++nextFetchId);
      const key = createHash("sha256").update(JSON.stringify([
        url, options.version, options.fetchOptions.cache,
        options.fetchOptions.next?.revalidate,
        [...new Set(options.fetchOptions.next?.tags ?? [])].sort(), fetchIds.get(fetchImpl),
        [...new Headers(options.fetchOptions.headers).entries()].sort(([a], [b]) => a.localeCompare(b)),
        options.fetchOptions.credentials, options.fetchOptions.redirect, options.fetchOptions.mode,
      ])).digest("hex");
      let flight = flights.get(key);
      if (!flight) {
        flight = execute(url, options);
        flights.set(key, flight);
        const current = flight;
        flight.finally(() => { if (flights.get(key) === current) flights.delete(key); }).catch(() => {});
      }
      return structuredClone(await flight) as T;
    },
  };
}

export const storyblokTransport = createStoryblokTransport();
