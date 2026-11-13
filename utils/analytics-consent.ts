export const ANALYTICS_ID = "G-ZT1LVQ4YHC";
export const CONSENT_KEY = "analytics-consent-v1";
const CONSENT_EVENT = "analytics-consent-change";
export type AnalyticsConsent = "unset" | "granted" | "denied";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};
const memory = new WeakMap<Window, AnalyticsConsent>();
const sessions = new WeakMap<Window, { lastPath: string }>();

export function readAnalyticsConsent(browser: Window = window): AnalyticsConsent {
  // A denial cookie also survives localStorage quota/write failures.
  try {
    if (/(?:^|;\s*)analytics-opt-out=1(?:;|$)/.test(browser.document.cookie)) return "denied";
  } catch {
    return "unset";
  }
  const current = memory.get(browser);
  if (current) return current;
  try {
    const saved = browser.localStorage.getItem(CONSENT_KEY);
    return saved === "granted" || saved === "denied" ? saved : "unset";
  } catch {
    return "unset";
  }
}

export function isAnalyticsPage(pathname: string, search = ""): boolean {
  return pathname !== "/live-preview" && !pathname.startsWith("/live-preview/")
    && !pathname.startsWith("/api/") && !new URLSearchParams(search).has("_storyblok");
}

function clearAnalyticsCookies(browser: Window) {
  const hostParts = browser.location.hostname.split(".");
  const domains = ["", ...hostParts.map((_, index) => `.${hostParts.slice(index).join(".")}`)];
  const parts = browser.location.pathname.split("/").filter(Boolean);
  const paths = ["/", ...parts.map((_, index) => `/${parts.slice(0, index + 1).join("/")}`)];
  for (const cookie of browser.document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
    for (const domain of domains) {
      for (const path of paths) {
        browser.document.cookie = `${name}=; Max-Age=0; Path=${path}${domain ? `; Domain=${domain}` : ""}; SameSite=Lax`;
      }
    }
  }
}

/** Disable transmission synchronously, then unload the third party on reload. */
export function stopAnalytics(browser: Window = window, reload = true) {
  Reflect.set(browser, `ga-disable-${ANALYTICS_ID}`, true);
  clearAnalyticsCookies(browser);
  const started = sessions.has(browser);
  sessions.delete(browser);
  if (started && reload) browser.location.reload();
}

export function setAnalyticsConsent(choice: Exclude<AnalyticsConsent, "unset">): boolean {
  // A denial takes effect even when browser storage is unavailable.
  if (choice === "denied") stopAnalytics(window, false);
  let persisted = false;
  let denialSaved = false;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    window.document.cookie = `analytics-opt-out=${choice === "denied" ? "1" : ""}; Path=/; Max-Age=${choice === "denied" ? 31536000 : 0}; SameSite=Lax${secure}`;
    denialSaved = /(?:^|;\s*)analytics-opt-out=1(?:;|$)/.test(window.document.cookie);
  } catch {
    // Storage failures are surfaced in the preferences UI, never treated as a grant.
  }
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
    persisted = window.localStorage.getItem(CONSENT_KEY) === choice;
  } catch {
    // A grant requires storage; otherwise a later reload could restore an old choice.
  }
  if (choice === "granted" && (!persisted || denialSaved)) {
    memory.set(window, "denied");
    stopAnalytics(window, false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
    return false;
  }
  memory.set(window, choice);
  window.dispatchEvent(new Event(CONSENT_EVENT));
  // Removing script elements alone cannot unload Google's existing listeners.
  if (choice === "denied" && (persisted || denialSaved) && window.document.getElementById("consented-analytics")) {
    window.location.reload();
  }
  return persisted || denialSaved;
}

export function subscribeAnalyticsConsent(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CONSENT_KEY) return;
    memory.delete(window);
    if (readAnalyticsConsent() !== "granted") stopAnalytics();
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONSENT_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONSENT_EVENT, listener);
  };
}

/** Idempotent across React effects, preferences changes, and SPA navigation. */
export function startAnalytics(pathname: string, browser: Window = window) {
  if (readAnalyticsConsent(browser) !== "granted"
    || !isAnalyticsPage(pathname, browser.location.search)
    || browser.self !== browser.top) return;

  const target = browser as AnalyticsWindow;
  let session = sessions.get(browser);
  if (!session) {
    // Do not reinject a runtime which could not be unloaded after a storage failure.
    if (browser.document.getElementById("consented-analytics")) return;
    target.dataLayer = [];
    target.gtag = function () {
      // gtag's command queue uses the standard Arguments object.
      // eslint-disable-next-line prefer-rest-params
      target.dataLayer?.push(arguments);
    };
    target.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    target.gtag("js", new Date());
    target.gtag("config", ANALYTICS_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `${browser.location.origin}${pathname}`,
    });
    session = { lastPath: "" };
    sessions.set(browser, session);
    const script = browser.document.createElement("script");
    script.id = "consented-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
    browser.document.head.appendChild(script);
  }
  Reflect.set(browser, `ga-disable-${ANALYTICS_ID}`, false);
  if (session.lastPath !== pathname) {
    session.lastPath = pathname;
    target.gtag?.("event", "page_view", {
      page_location: `${browser.location.origin}${pathname}`,
      page_title: browser.document.title,
    });
  }
}
