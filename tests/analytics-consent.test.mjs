import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_ID, CONSENT_KEY, isAnalyticsPage, readAnalyticsConsent,
  setAnalyticsConsent, startAnalytics, stopAnalytics, subscribeAnalyticsConsent,
} from "../utils/analytics-consent.ts";

function fakeBrowser() {
  const values = new Map();
  const scripts = [];
  const events = new EventTarget();
  const browser = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    document: {
      cookie: "", title: "Fixture",
      getElementById: (id) => scripts.find((script) => script.id === id),
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) },
    },
    location: { origin: "https://example.com", hostname: "example.com", pathname: "/posts", search: "", reload: () => { browser.reloads++; } },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    reloads: 0,
  };
  browser.self = browser;
  browser.top = browser;
  return { browser, values, scripts };
}

test("legacy, malformed, missing, and unavailable storage never grant consent", () => {
  const { browser, values, scripts } = fakeBrowser();
  values.set("cookieConsent", "true");
  assert.equal(readAnalyticsConsent(browser), "unset");
  values.set(CONSENT_KEY, "true");
  assert.equal(readAnalyticsConsent(browser), "unset");
  browser.localStorage.getItem = () => { throw new Error("Storage blocked"); };
  assert.equal(readAnalyticsConsent(browser), "unset");
  startAnalytics("/posts", browser);
  assert.equal(scripts.length, 0);
});

test("granted analytics initializes once and sends one view for each actual path change", () => {
  const { browser, values, scripts } = fakeBrowser();
  values.set(CONSENT_KEY, "granted");
  browser.location.search = "?email=not-sent%40example.com";
  startAnalytics("/posts", browser);
  startAnalytics("/posts", browser);
  startAnalytics("/categories", browser);
  assert.equal(scripts.length, 1);
  const commands = browser.dataLayer;
  assert.equal(commands.filter(([type]) => type === "config").length, 1);
  assert.deepEqual(commands.filter(([type]) => type === "event").map((command) => command[2].page_location), ["https://example.com/posts", "https://example.com/categories"]);
  assert.equal(commands.find(([type]) => type === "config")[2].send_page_view, false);
  assert.equal(commands[0][2].ad_storage, "denied");
  assert.equal(JSON.stringify(commands).includes("not-sent"), false);
  stopAnalytics(browser);
  assert.equal(browser[`ga-disable-${ANALYTICS_ID}`], true);
  assert.equal(browser.reloads, 1);
});

test("preview, editor, API, and embedded pages never start analytics", () => {
  for (const [path, search] of [["/live-preview", ""], ["/live-preview/es-co/posts/example", ""], ["/posts", "?_storyblok=1"], ["/api/draft", ""]]) {
    assert.equal(isAnalyticsPage(path, search), false);
    const { browser, values, scripts } = fakeBrowser();
    values.set(CONSENT_KEY, "granted");
    browser.location.search = search;
    startAnalytics(path, browser);
    assert.equal(scripts.length, 0);
  }
  const { browser, values, scripts } = fakeBrowser();
  values.set(CONSENT_KEY, "granted");
  browser.top = {};
  startAnalytics("/posts", browser);
  assert.equal(scripts.length, 0);
});

test("revocation and cross-tab storage clearing disable an active runtime immediately", () => {
  const { browser, values } = fakeBrowser();
  const original = globalThis.window;
  globalThis.window = browser;
  try {
    assert.equal(setAnalyticsConsent("granted"), true);
    startAnalytics("/posts");
    assert.equal(setAnalyticsConsent("denied"), true);
    assert.equal(readAnalyticsConsent(), "denied");
    assert.equal(browser[`ga-disable-${ANALYTICS_ID}`], true);
    assert.equal(browser.reloads, 1);

    const other = fakeBrowser();
    globalThis.window = other.browser;
    other.values.set(CONSENT_KEY, "granted");
    startAnalytics("/posts");
    let notifications = 0;
    const unsubscribe = subscribeAnalyticsConsent(() => { notifications++; });
    other.values.delete(CONSENT_KEY);
    const event = new Event("storage");
    Object.defineProperty(event, "key", { value: null });
    other.browser.dispatchEvent(event);
    assert.equal(other.browser[`ga-disable-${ANALYTICS_ID}`], true);
    assert.equal(other.browser.reloads, 1);
    assert.equal(notifications, 1);
    unsubscribe();
    values.clear();
  } finally {
    globalThis.window = original;
  }
});

test("a failed persistence operation cannot enable or re-enable analytics", () => {
  const { browser, scripts } = fakeBrowser();
  const original = globalThis.window;
  globalThis.window = browser;
  try {
    browser.localStorage.setItem = () => { throw new Error("Storage blocked"); };
    assert.equal(setAnalyticsConsent("granted"), false);
    assert.equal(readAnalyticsConsent(), "denied");
    startAnalytics("/posts");
    assert.equal(scripts.length, 0);
  } finally { globalThis.window = original; }
});

test("a denial survives localStorage write failure through the opt-out cookie", () => {
  const { browser, values } = fakeBrowser();
  const original = globalThis.window;
  globalThis.window = browser;
  try {
    values.set(CONSENT_KEY, "granted");
    startAnalytics("/posts");
    browser.localStorage.setItem = () => { throw new Error("Quota exceeded"); };
    assert.equal(setAnalyticsConsent("denied"), true);
    const fresh = fakeBrowser();
    fresh.values.set(CONSENT_KEY, "granted");
    fresh.browser.document.cookie = browser.document.cookie;
    assert.equal(readAnalyticsConsent(fresh.browser), "denied");
    assert.equal(browser[`ga-disable-${ANALYTICS_ID}`], true);
    assert.equal(browser.reloads, 1);
  } finally { globalThis.window = original; }
});
