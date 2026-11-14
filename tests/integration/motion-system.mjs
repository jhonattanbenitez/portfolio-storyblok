import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
import { HOME_V2_COPY } from "../../lib/home-v2.ts";

// Real browser integration only. Never aim this harness at Production or a CMS.
const target = new URL(process.env.MOTION_ORIGIN || "http://127.0.0.1:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname), "LOCAL_ORIGIN_REQUIRED");
assert.ok(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && target.pathname === "/", "UNSAFE_ORIGIN");
const output = resolve(process.env.MOTION_OUTPUT || "artifacts/home-v2/motion-system-v1/browser");
assert.ok(!output.includes("/public/"), "PRIVATE_EVIDENCE_REQUIRED");
await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, "NEW_OUTPUT_REQUIRED");
const sha = value => createHash("sha256").update(value).digest("hex");
const save = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2), { mode: 0o600 });
const safe = value => String(value).replace(/https?:\/\/\S+/g, "[URL]").replace(/([?&](?:token|secret|password|access_token)=)[^\s&#]+/gi, "$1[REDACTED]");
const scenarios = [], steps = [], samples = [], recordings = [], errors = [], consoleErrors = [], failedRequests = [], blocked = [], analytics = [];
const executedSource = await readFile(new URL(import.meta.url));
await writeFile(join(output, "harness-source.mjs"), executedSource, { mode: 0o600 });
await save("run-identity.json", { harnessSha256: sha(executedSource), buildId: process.env.MOTION_BUILD_ID || null, cases: process.env.MOTION_CASES || "all", phases: process.env.MOTION_PHASES || "all", legacyFixture: process.env.MOTION_LEGACY_FIXTURE === "true" });
let browser, activePage, current = "launch", failure, status = "FAIL";
const byId = (page, id) => page.locator(`[id=${JSON.stringify(id)}]`);
const milliseconds = value => value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;

async function context({ theme = "light", width = 1440, locale = "en", reduced = false, javascript = true } = {}) {
  const c = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 768, hasTouch: width < 768, colorScheme: theme, reducedMotion: reduced ? "reduce" : "no-preference", javaScriptEnabled: javascript, locale: locale === "en" ? "en-US" : "es-CO" });
  await c.addInitScript(({ theme }) => {
    if (localStorage.getItem("theme") === null) localStorage.setItem("theme", theme);
    if (localStorage.getItem("analytics-consent-v1") === null) localStorage.setItem("analytics-consent-v1", "denied");
  }, { theme });
  await c.route("**/*", route => {
    const r = route.request(), u = new URL(r.url());
    if (/google-analytics|googletagmanager/.test(u.hostname)) { analytics.push({ host: u.hostname, path: u.pathname }); return route.abort(); }
    if (!["GET", "HEAD"].includes(r.method()) || u.origin === target.origin && /^\/(?:api|live-preview)(?:\/|$)/.test(u.pathname)) {
      blocked.push({ method: r.method(), host: u.hostname, path: u.pathname }); return route.abort();
    }
    return route.continue();
  });
  const page = await c.newPage(); activePage = page;
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(45000);
  page.on("pageerror", e => errors.push({ scenario: current, name: e.name, message: safe(e.message) }));
  page.on("console", m => { if (m.type() === "error") { let host = ""; try { host = new URL(m.location().url).hostname; } catch { /* Browser errors may lack a URL. */ } consoleErrors.push({ scenario: current, host, text: safe(m.text()) }); } });
  page.on("requestfailed", r => { const u = new URL(r.url()); failedRequests.push({ scenario: current, host: u.hostname, path: u.pathname, error: r.failure()?.errorText || "UNKNOWN" }); });
  return { c, page };
}
async function ready(page, locale = "en") {
  await page.getByRole("heading", { level: 1, name: HOME_V2_COPY[locale].headline, exact: true }).waitFor();
  await page.locator('button[aria-label="Toggle theme"]').first().waitFor({ state: "attached" });
  await page.waitForFunction(locale => document.documentElement.lang === locale, locale === "en" ? "en" : "es-CO");
  await page.evaluate(() => document.fonts.ready);
}
async function gotoHome(page, locale = "en", javascript = true) {
  const path = locale === "en" ? "/" : "/es-co";
  assert.equal((await page.goto(target.origin + path, { waitUntil: "domcontentloaded" })).status(), 200);
  if (javascript) await ready(page, locale);
  else await page.getByRole("heading", { level: 1, name: HOME_V2_COPY[locale].headline, exact: true }).waitFor();
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.jhonattan.dev" + (path === "/" ? "" : path));
}
async function shot(page, name) {
  await page.locator("img").evaluateAll(async images => {
    for (const image of images) {
      const r = image.getBoundingClientRect();
      if (r.width && r.height && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0) await image.decode();
    }
  });
  await page.screenshot({ path: join(output, name + ".png"), animations: "allow" });
}
async function settled(locator) {
  await locator.evaluate(async element => {
    // Animation.finished is a condition, not a guessed wait. A reversal cancels
    // the old transition, so wait for the latest set until none remains active.
    const deadline = performance.now() + 2500;
    for (;;) {
      const running = element.getAnimations({ subtree: true }).filter(a => ["running", "pending"].includes(a.playState));
      const pseudo = element.tagName === "DETAILS" ? getComputedStyle(element, "::details-content") : null;
      const pseudoDone = !pseudo || (element.open ? parseFloat(pseudo.opacity) === 1 : parseFloat(pseudo.opacity) === 0 && parseFloat(pseudo.blockSize) <= 0.1);
      if (!running.length && pseudoDone) break;
      if (performance.now() > deadline) throw new Error("MOTION_DID_NOT_SETTLE");
      if (running.length) await Promise.allSettled(running.map(a => a.finished));
      else await new Promise(requestAnimationFrame);
    }
  });
}
async function state(locator) {
  return locator.evaluate(element => {
    const s = getComputedStyle(element), r = element.getBoundingClientRect();
    return { state: element.getAttribute("data-state"), inert: element.inert, ariaHidden: element.getAttribute("aria-hidden"), opacity: parseFloat(s.opacity), visibility: s.visibility, pointerEvents: s.pointerEvents, transform: s.transform, height: r.height, width: r.width, focusedInside: element.contains(document.activeElement) };
  });
}
async function sample(locator, label, pseudo = null) {
  const values = await locator.evaluate(async (element, pseudo) => {
    const rows = [], deadline = performance.now() + 2000;
    let saw = false;
    for (;;) {
      const animations = element.getAnimations({ subtree: true }).filter(a => ["running", "pending"].includes(a.playState));
      const s = getComputedStyle(element, pseudo), r = element.getBoundingClientRect();
      const row = { at: performance.now(), opacity: parseFloat(s.opacity), blockSize: s.blockSize, height: r.height, transform: s.transform, visibility: s.visibility, animations: animations.map(a => ({ state: a.playState, currentTime: a.currentTime, duration: a.effect?.getTiming().duration, property: a.transitionProperty || null, pseudoElement: a.effect?.pseudoElement || null })) };
      if (animations.length) saw = true;
      rows.push(row);
      // Chromium can animate ::details-content without exposing its CSS
      // transitions through Element.getAnimations(). Observe its real endpoint
      // directly rather than finishing when the faster summary icon settles.
      const pseudoDone = pseudo ? (element.open ? parseFloat(s.opacity) === 1 : parseFloat(s.opacity) === 0 && parseFloat(s.blockSize) <= 0.1) : true;
      if (saw && !animations.length && pseudoDone || performance.now() >= deadline) break;
      if (!saw && rows.length >= 4 && pseudoDone) break;
      await new Promise(requestAnimationFrame);
    }
    return rows;
  }, pseudo);
  samples.push({ scenario: current, label, values });
  return values;
}
async function lockChecks(page, panel, trigger) {
  const s = await state(panel);
  assert.equal(s.state, "closed", "CLOSING_STATE");
  assert.equal(s.inert, true, "CLOSING_PANEL_INERT_IMMEDIATELY");
  assert.equal(s.ariaHidden, "true", "CLOSING_PANEL_ARIA_HIDDEN_IMMEDIATELY");
  assert.equal(s.pointerEvents, "none", "CLOSING_PANEL_NO_HIT_TARGETS");
  assert.equal(s.focusedInside, false, "FOCUS_NOT_LEFT_IN_EXITING_PANEL");
  const child = panel.locator('a[href],button,[tabindex="0"]').first();
  if (await child.count()) { await child.evaluate(e => e.focus()); assert.equal(await panel.evaluate(e => e.contains(document.activeElement)), false, "INERT_PANEL_REJECTS_PROGRAMMATIC_FOCUS"); }
  assert.equal((await panel.ariaSnapshot()).trim(), "", "EXITING_PANEL_EXCLUDED_FROM_ACCESSIBILITY_TREE");
  await trigger.focus(); await page.keyboard.press("Tab");
  assert.equal(await panel.evaluate(e => e.contains(document.activeElement)), false, "TAB_SKIPS_EXITING_PANEL");
  return s;
}
function assertMoving(values, label) {
  assert.ok(values.some(v => v.animations.length), "REAL_ANIMATION_REQUIRED:" + label);
  assert.ok(values.some(v => v.opacity > 0 && v.opacity < 1), "INTERMEDIATE_OPACITY_REQUIRED:" + label);
}

async function recorder(page, name) {
  const directory = join(output, name + "-frames"); await mkdir(directory);
  const cdp = await page.context().newCDPSession(page), frames = [], writes = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = join(directory, String(frames.length).padStart(5, "0") + ".jpg");
    frames.push({ file, timestamp: metadata.timestamp }); writes.push(writeFile(file, Buffer.from(data, "base64"), { mode: 0o600 }));
    void cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 80, maxWidth: 1440, maxHeight: 1000, everyNthFrame: 1 });
  return async () => {
    await cdp.send("Page.stopScreencast"); await Promise.all(writes); await cdp.detach();
    assert.ok(frames.length >= 2, "RECORDING_NEEDS_FRAMES");
    const concat = frames.map((f, i) => `file '${f.file.replaceAll("'", "'\\''")}'\n${i + 1 < frames.length ? "duration " + Math.max(0.001, frames[i + 1].timestamp - f.timestamp) + "\n" : ""}`).join("");
    const manifest = join(directory, "frames.txt"); await writeFile(manifest, concat, { mode: 0o600 });
    const video = join(output, name + ".mp4");
    await promisify(execFile)("/usr/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", manifest, "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-fps_mode", "vfr", "-pix_fmt", "yuv420p", "-movflags", "+faststart", video]);
    const result = { path: name + ".mp4", frames: frames.length, durationSeconds: frames.at(-1).timestamp - frames[0].timestamp, source: "Real Chromium CDP frames; existing ffmpeg, no installed dependency" };
    recordings.push(result); return result;
  };
}

async function dropdown(page, locale, reduced) {
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  const blog = nav.getByRole("link", { name: "Blog", exact: true });
  const id = await blog.getAttribute("aria-controls"), panel = byId(page, id);
  await page.mouse.move(4, 950); await blog.hover();
  await page.waitForFunction(id => document.getElementById(id)?.getAttribute("data-state") === "open", id);
  const opening = sample(panel, "desktop-blog-open");
  const child = panel.getByRole("link").first(); await child.focus();
  assert.equal(await child.evaluate(e => e === document.activeElement), true, "FOCUS_AVAILABLE_DURING_ENTRANCE");
  const openSamples = await opening;
  if (!reduced) assertMoving(openSamples, "desktop-blog-open");
  else assert.equal(openSamples.some(v => v.animations.length), false, "REDUCED_DROPDOWN_NO_ANIMATIONS");
  await page.keyboard.press("Escape");
  const [closeSamples, closing] = await Promise.all([sample(panel, "desktop-blog-close"), lockChecks(page, panel, blog)]);
  if (!reduced) assertMoving(closeSamples, "desktop-blog-close");
  await settled(panel); assert.equal((await state(panel)).visibility, "hidden");
  // Ten alternating events in separate frames exercise reversal while still
  // inside the 160/220 ms transition window, without timer-based sleeps.
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(4, 950); await blog.hover();
    await blog.evaluate(async e => { e.focus(); await new Promise(requestAnimationFrame); });
    await page.keyboard.press("Escape");
    assert.equal((await state(panel)).inert, true);
  }
  await settled(panel); assert.equal((await state(panel)).state, "closed");
  await page.mouse.move(4, 950); await blog.hover(); await settled(panel);
  await page.mouse.click(5, 950); await page.waitForFunction(id => document.getElementById(id)?.getAttribute("data-state") === "closed", id);
  await settled(panel);
  steps.push({ scenario: current, action: "desktop-dropdown-open-close-exit-locks-keyboard-outside-ten-reversals", pass: true, closing });
}
async function themeMenu(page, container, reduced) {
  const trigger = container.getByRole("button", { name: "Toggle theme", exact: true }), id = await trigger.getAttribute("aria-controls"), panel = byId(page, id);
  await trigger.click(); await page.waitForFunction(id => document.getElementById(id)?.getAttribute("data-state") === "open", id);
  const values = await sample(panel, "theme-open"); if (!reduced) assertMoving(values, "theme-open");
  await panel.getByRole("button").first().focus(); await page.keyboard.press("Escape");
  assert.equal(await trigger.evaluate(e => e === document.activeElement), true, "THEME_ESCAPE_RESTORES_FOCUS");
  await lockChecks(page, panel, trigger); await settled(panel);
  for (let i = 0; i < 10; i++) {
    await trigger.evaluate(async e => { e.click(); await new Promise(requestAnimationFrame); });
    await trigger.evaluate(async e => { e.click(); await new Promise(requestAnimationFrame); });
  }
  await settled(panel); assert.equal((await state(panel)).state, "closed");
  steps.push({ scenario: current, action: "theme-open-close-focus-ten-rapid-reversals", pass: true });
}
async function mobileMenu(page, reduced) {
  const nav = page.getByRole("navigation", { name: "Primary", exact: true }), trigger = nav.locator('button[aria-controls="mobile-navigation-panel"]'), panel = byId(page, "mobile-navigation-panel");
  const navHeightBefore = await nav.evaluate(e => e.getBoundingClientRect().height);
  await trigger.click(); await page.waitForFunction(() => document.getElementById("mobile-navigation-panel")?.getAttribute("data-state") === "open");
  const values = await sample(panel, "mobile-open"); if (!reduced) assertMoving(values, "mobile-open");
  const navHeightOpen = await nav.evaluate(e => e.getBoundingClientRect().height);
  assert.ok(Math.abs(navHeightOpen - navHeightBefore) <= 1, "MOBILE_OVERLAY_MUST_NOT_EXPAND_FIXED_HEADER_BOX");
  const blog = panel.getByRole("button", { name: /^Blog(?:\s|$)/ }), id = await blog.getAttribute("aria-controls"), submenu = byId(page, id);
  assert.equal((await state(submenu)).inert, true);
  await blog.click(); await page.waitForFunction(id => document.getElementById(id)?.getAttribute("data-state") === "open", id);
  const subValues = await sample(submenu, "mobile-blog-expand");
  if (!reduced) assert.ok(subValues.some(v => v.animations.length), "MOBILE_SUBMENU_HEIGHT_ANIMATION");
  await blog.click(); assert.equal((await state(submenu)).inert, true); assert.equal((await state(submenu)).ariaHidden, "true"); await settled(submenu);
  await themeMenu(page, panel, reduced); assert.equal(await trigger.getAttribute("aria-expanded"), "true", "INNER_ESCAPE_MUST_NOT_CLOSE_MOBILE_MENU");
  await page.keyboard.press("Escape"); assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
  const [exit] = await Promise.all([sample(panel, "mobile-close"), lockChecks(page, panel, trigger)]); if (!reduced) assertMoving(exit, "mobile-close");
  await settled(panel); assert.equal((await state(panel)).visibility, "hidden");
  for (let i = 0; i < 10; i++) {
    await trigger.evaluate(async e => { e.click(); await new Promise(requestAnimationFrame); });
    await trigger.evaluate(async e => { e.click(); await new Promise(requestAnimationFrame); });
  }
  await settled(panel); assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  await trigger.click(); await settled(panel);
  const nestedThemeTrigger = panel.getByRole("button", { name: "Toggle theme", exact: true });
  await nestedThemeTrigger.click();
  const nestedId = await nestedThemeTrigger.getAttribute("aria-controls");
  await page.waitForFunction(id => document.getElementById(id)?.getAttribute("data-state") === "open", nestedId);
  // Closing the outer menu while a child popup is open must not leave a stale
  // popup, focus target, or reopened child on the next outer-menu opening.
  await trigger.click(); assert.equal((await state(panel)).inert, true);
  await settled(panel); await trigger.click(); await settled(panel);
  const reopenedTheme = panel.getByRole("button", { name: "Toggle theme", exact: true });
  assert.equal(await reopenedTheme.getAttribute("aria-expanded"), "false", "MOBILE_REOPEN_RESETS_NESTED_THEME");
  const resetPopup = byId(page, await reopenedTheme.getAttribute("aria-controls"));
  assert.equal((await state(resetPopup)).inert, true, "RESET_THEME_POPUP_INERT");
  await page.mouse.click(5, 950);
  await page.waitForFunction(() => document.getElementById("mobile-navigation-panel")?.getAttribute("data-state") === "closed"); await settled(panel);
  steps.push({ scenario: current, action: "mobile-open-close-submenu-inert-nested-Escape-focus-outside-ten-reversals", pass: true, nestedThemeReset: true, navHeightBefore, navHeightOpen });
}
async function details(page, locale, reduced) {
  const copy = HOME_V2_COPY[locale], groups = ["skills", "education", "certifications"];
  for (const key of groups) {
    const detail = page.locator(".home-v2-credentials details").filter({ has: page.locator("summary", { hasText: copy[key] }) });
    assert.equal(await detail.count(), 1, "REAL_CREDENTIAL_GROUP:" + key);
    const summary = detail.locator("summary"); await summary.scrollIntoViewIfNeeded();
    const closedHeight = await detail.evaluate(e => e.getBoundingClientRect().height);
    const indicator = summary.locator(".motion-indicator"), closedIndicator = await indicator.evaluate(e => getComputedStyle(e).transform);
    await summary.focus(); await page.keyboard.press("Enter");
    await page.waitForFunction(label => [...document.querySelectorAll(".home-v2-credentials details")].some(e => e.open && e.querySelector("summary").textContent.includes(label)), copy[key]);
    await page.waitForFunction(label => [...document.querySelectorAll(".home-v2-credentials details")].find(e => e.querySelector("summary").textContent.includes(label))?.hasAttribute("data-motion-ready"), copy[key]);
    const body = detail.locator(":scope > :not(summary)").first();
    const openValues = await sample(detail, "details-" + key + "-open", "::details-content");
    if (!reduced) assert.ok(openValues.some(v => v.animations.length), "DETAILS_REAL_ANIMATION:" + key);
    await settled(detail); const openHeight = await detail.evaluate(e => e.getBoundingClientRect().height);
    assert.ok(openHeight > closedHeight + 5, "DETAILS_CONTENT_EXPANDS:" + key);
    if (!reduced) {
      assert.ok(openValues.some(v => v.height > closedHeight + 1 && v.height < openHeight - 1), "DETAILS_INTERMEDIATE_HEIGHT:" + key);
      assert.ok(openValues.some(v => v.opacity > 0 && v.opacity < 1), "DETAILS_INTERMEDIATE_OPACITY:" + key);
    }
    assert.equal(await body.evaluate(e => e.inert), false);
    assert.notEqual(await indicator.evaluate(e => getComputedStyle(e).transform), closedIndicator, "EXPANSION_INDICATOR_RETAINS_STATE_INCLUDING_REDUCED_MOTION");
    const marker = (await body.locator("li").first().textContent()).trim().slice(0, 30); assert.ok(marker.length);
    assert.ok((await detail.ariaSnapshot()).includes(marker), "OPEN_DETAILS_EXPOSES_REAL_CONTENT_IN_AX");
    // Playwright's DOM-derived ariaSnapshot includes inert details descendants
    // during the native content-visibility exit. Query Chromium's actual AX
    // node instead; cache identity while open so the exit is still observable.
    const ax = await page.context().newCDPSession(page);
    const { root } = await ax.send("DOM.getDocument");
    const { nodeIds } = await ax.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: ".home-v2-credentials details" });
    const index = await detail.evaluate(e => [...document.querySelectorAll(".home-v2-credentials details")].indexOf(e));
    const { nodeId } = await ax.send("DOM.querySelector", { nodeId: nodeIds[index], selector: ":scope > :not(summary)" });
    const { node: { backendNodeId } } = await ax.send("DOM.describeNode", { nodeId });
    const openAx = await ax.send("Accessibility.getPartialAXTree", { backendNodeId, fetchRelatives: false });
    assert.equal(openAx.nodes[0].ignored, false, "OPEN_DETAILS_CONTENT_EXPOSED_IN_BROWSER_AX");
    await page.keyboard.press("Enter");
    assert.equal(await detail.evaluate(e => e.open), false);
    assert.equal(await body.evaluate(e => e.inert), true, "NATIVE_DETAILS_CLOSING_BODY_INERT");
    const [closingValues, closedTree] = await Promise.all([
      sample(detail, "details-" + key + "-close", "::details-content"),
      ax.send("Accessibility.getPartialAXTree", { backendNodeId, fetchRelatives: false }),
    ]);
    const closedNode = closedTree.nodes.find(n => n.backendDOMNodeId === backendNodeId);
    assert.equal(closedNode?.ignored, true, "CLOSING_DETAILS_EXCLUDED_FROM_BROWSER_AX");
    assert.ok(closedNode.ignoredReasons?.some(r => /inert|notRendered/i.test(r.name)), "CLOSING_DETAILS_EXCLUDED_BY_INERT_OR_NATIVE_HIDDEN_CONTENT");
    await page.keyboard.press("Tab");
    assert.equal(await body.evaluate(e => e.contains(document.activeElement)), false, "TAB_SKIPS_CLOSING_DETAILS_CONTENT");
    const closedAx = { ignored: closedNode.ignored, reasons: closedNode.ignoredReasons.map(r => r.name), playwrightSnapshot: await detail.ariaSnapshot() };
    await ax.detach();
    if (!reduced) assert.ok(closingValues.some(v => v.animations.length), "DETAILS_EXIT_ANIMATION:" + key);
    await settled(detail); assert.ok(Math.abs((await detail.evaluate(e => e.getBoundingClientRect().height)) - closedHeight) <= 1, "DETAILS_CLOSES_TO_SUMMARY");
    assert.equal(await indicator.evaluate(e => getComputedStyle(e).transform), closedIndicator, "CLOSED_INDICATOR_STATE");
    for (let i = 0; i < 10; i++) await summary.evaluate(async e => { e.click(); await new Promise(requestAnimationFrame); });
    await settled(detail); assert.equal(await detail.evaluate(e => e.open), false, "DETAILS_RAPID_TOGGLE_LATEST_STATE");
    // Native/programmatic changes are observed too; no content may remain
    // interactive after an author sets .open=false without a summary click.
    await detail.evaluate(e => { e.open = true; }); await settled(detail);
    await detail.evaluate(e => { e.open = false; });
    await page.waitForFunction(label => [...document.querySelectorAll(".home-v2-credentials details")].find(e => e.querySelector("summary").textContent.includes(label))?.querySelector(":scope > :not(summary)")?.inert === true, copy[key]);
    await settled(detail);
    steps.push({ scenario: current, action: "native-details-" + key, pass: true, closedHeight, openHeight, closedAx });
  }
}
async function scrollRestored(page) {
  return page.evaluate(async () => {
    let stable = 0, previous = scrollY;
    const deadline = performance.now() + 2500;
    while (stable < 4) {
      await new Promise(requestAnimationFrame);
      if (Math.abs(scrollY - previous) <= 1) stable++;
      else stable = 0;
      previous = scrollY;
      if (performance.now() > deadline) throw new Error("NATIVE_HISTORY_SCROLL_RESTORATION_INCOMPLETE:" + scrollY);
    }
    return { y: scrollY, restoration: history.scrollRestoration, hash: location.hash };
  });
}
async function focusDuringDetailsOpening(page) {
  const detail = page.locator("details.home-v2-more-work");
  if (!await detail.count()) { steps.push({ scenario: current, action: "focus-during-details-opening", status: "NOT_APPLICABLE_NO_MORE_WORK" }); return; }
  const rows = await detail.evaluate(async e => {
    const summary = e.querySelector("summary"), body = e.querySelector(":scope > :not(summary)"), link = body.querySelector("a[href]");
    if (!link) return [];
    summary.focus({ preventScroll: true }); summary.click();
    const rows = [];
    for (let i = 0; i < 8; i++) {
      await new Promise(requestAnimationFrame);
      link.focus({ preventScroll: true });
      const r = link.getBoundingClientRect(), bounds = e.getBoundingClientRect(), pseudo = getComputedStyle(e, "::details-content");
      rows.push({ at: performance.now(), focused: document.activeElement === link, linkTop: r.top, linkBottom: r.bottom, detailBottom: bounds.bottom, opacity: parseFloat(pseudo.opacity), clipped: r.top >= bounds.bottom || r.bottom <= bounds.top, inert: body.inert });
    }
    summary.click();
    rows.push({ closed: !e.open, bodyInert: body.inert, focusReturnedToSummary: document.activeElement === summary });
    return rows;
  });
  assert.ok(rows.length, "REAL_MORE_WORK_LINKS_REQUIRED");
  const focused = rows.filter(r => r.focused);
  assert.ok(focused.length, "DETAILS_LINK_RECEIVES_FOCUS_DURING_OPENING");
  for (const row of focused) {
    assert.equal(row.inert, false, "OPENING_BODY_NOT_INERT");
    assert.equal(row.clipped, false, "FOCUSED_OPENING_CONTENT_NOT_CLIPPED");
    assert.equal(row.opacity, 1, "FOCUSED_OPENING_CONTENT_IMMEDIATELY_OPAQUE");
  }
  assert.deepEqual(rows.at(-1), { closed: true, bodyInert: true, focusReturnedToSummary: true }, "CLOSING_FOCUSED_DETAILS_SAFE");
  await page.keyboard.press("Tab");
  assert.equal(await detail.locator(":scope > :not(summary)").first().evaluate(e => e.contains(document.activeElement)), false);
  await settled(detail);
  // Exercise actual sequential focus after the native body starts rendering,
  // as well as the deterministic programmatic focus/clip regression above.
  const summary = detail.locator("summary"); await summary.scrollIntoViewIfNeeded(); await summary.focus();
  await page.keyboard.press("Enter");
  // No wait here: native Enter→Tab must enter the opening disclosure without
  // requiring the user to wait for content-visibility or the visual animation.
  await page.keyboard.press("Tab");
  const tab = await detail.evaluate(e => {
    const a = document.activeElement, r = a.getBoundingClientRect(), bounds = e.getBoundingClientRect(), body = e.querySelector(":scope > :not(summary)");
    return { focusedInBody: body.contains(a), opacity: parseFloat(getComputedStyle(e, "::details-content").opacity), clipped: r.top >= bounds.bottom || r.bottom <= bounds.top, focusTop: r.top, focusBottom: r.bottom, viewportHeight: innerHeight };
  });
  assert.equal(tab.focusedInBody, true, "TAB_ENTERS_OPENING_DETAILS");
  assert.equal(tab.opacity, 1, "TAB_FOCUS_IMMEDIATELY_OPAQUE");
  assert.equal(tab.clipped, false, "TAB_FOCUS_NOT_CLIPPED_BY_OPENING_HEIGHT");
  // Native focus scrolling follows the document's smooth-scroll preference;
  // keep the immediate no-clipping assertion above, then wait for the actual
  // viewport reveal rather than racing that independent native scroll.
  await page.waitForFunction(() => { const r = document.activeElement.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  const revealedTab = await detail.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, y: scrollY }; });
  assert.ok(revealedTab.bottom > 0 && revealedTab.top < await page.evaluate(() => innerHeight), "TAB_FOCUS_VISIBLE_IN_VIEWPORT");
  await shot(page, current + "-details-focused-" + (await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches) ? "reduced" : "normal"));
  await summary.evaluate(e => e.click()); await settled(detail);
  steps.push({ scenario: current, action: "focus-during-details-opening", pass: true, rows, tab, revealedTab });
}
async function anchorsAndCards(page, locale, reduced) {
  const prefix = locale === "en" ? "" : "/es-co", nav = page.getByRole("navigation", { name: "Primary", exact: true });
  const anchorRows = [];
  for (const id of ["projects", "about", "contact"]) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => scrollY === 0); await scrollRestored(page);
    const beforeUrl = page.url(), initialLength = await page.evaluate(() => history.length);
    if (await nav.getByRole("button", { name: "Open menu", exact: true }).isVisible()) {
      await nav.getByRole("button", { name: "Open menu", exact: true }).click(); await settled(byId(page, "mobile-navigation-panel"));
    }
    const link = nav.locator(`a[href$=${JSON.stringify("#" + id)}]`).filter({ visible: true });
    const href = new URL(await link.getAttribute("href"), page.url());
    // Next normalizes /es-co/#id to /es-co#id in rendered links. Preserve
    // destination identity and native history instead of assuming that slash.
    assert.equal(href.origin, target.origin, "SECTION_LINK_INTERNAL_ORIGIN");
    assert.equal(href.pathname.replace(/\/$/, ""), prefix, "SECTION_LINK_LOCALIZED_PATH");
    assert.equal(href.hash, "#" + id, "SECTION_LINK_EXPECTED_HASH");
    await link.click(); await page.waitForURL(u => u.hash === "#" + id, { waitUntil: "commit" });
    const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    assert.equal(behavior, reduced ? "auto" : "smooth");
    await page.waitForFunction(id => {
      const target = document.getElementById(id), nav = document.querySelector('nav[aria-label="Primary"]'), top = target.getBoundingClientRect().top, offset = parseFloat(getComputedStyle(target).scrollMarginTop);
      const bottomClamped = document.documentElement.scrollHeight - innerHeight - scrollY <= 2;
      return top >= nav.firstElementChild.getBoundingClientRect().height - 1 && (Math.abs(top - offset) <= 3 || bottomClamped && top >= offset - 3);
    }, id);
    const geometry = await page.locator("#" + id).evaluate(e => ({ top: e.getBoundingClientRect().top, scrollMarginTop: getComputedStyle(e).scrollMarginTop, scrollY, scrollHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight }));
    // Back/forward behavior proves history preservation even when a new push
    // replaces an existing forward entry, where history.length need not grow.
    await page.goBack({ waitUntil: "commit" }); await page.waitForURL(beforeUrl, { waitUntil: "commit" }); await scrollRestored(page);
    await page.goForward({ waitUntil: "commit" }); await page.waitForURL(u => u.hash === "#" + id, { waitUntil: "commit" }); await scrollRestored(page);
    await page.goBack({ waitUntil: "commit" }); await page.waitForURL(beforeUrl, { waitUntil: "commit" }); await scrollRestored(page);
    anchorRows.push({ id, scrollBehavior: behavior, initialHistoryLength: initialLength, geometry, backForwardRestored: true });
  }
  const card = page.locator(".home-v2-work").first(); await card.scrollIntoViewIfNeeded();
  const box = await card.evaluate(e => ({ top: e.offsetTop, height: e.offsetHeight, width: e.offsetWidth }));
  await card.hover(); await settled(card);
  const after = await card.evaluate(e => ({ top: e.offsetTop, height: e.offsetHeight, width: e.offsetWidth, transform: getComputedStyle(e).transform }));
  assert.deepEqual({ top: after.top, height: after.height, width: after.width }, box, "CARD_HOVER_DOES_NOT_CHANGE_LAYOUT_BOX");
  if (reduced) assert.equal(after.transform, "none", "REDUCED_CARD_HOVER_NO_TRANSFORM");
  else if (await page.evaluate(() => matchMedia("(hover:hover) and (pointer:fine)").matches)) assert.notEqual(after.transform, "none", "CARD_SUBTLE_HOVER_TRANSFORM");
  else assert.equal(after.transform, "none", "COARSE_POINTER_CARD_NO_HOVER_MOTION");
  steps.push({ scenario: current, action: "native-anchor-history-offset-and-card-no-layout-shift", pass: true, anchors: anchorRows, cardBox: box, cardTransform: after.transform });
}

async function reducedChecks(page, locale, width) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  if (width >= 768) {
    await page.mouse.move(5, 950); const blog = nav.getByRole("link", { name: "Blog", exact: true }); await blog.hover();
    const panel = byId(page, await blog.getAttribute("aria-controls"));
    await page.waitForFunction(id => document.getElementById(id)?.getAttribute("data-state") === "open", await blog.getAttribute("aria-controls"));
    assert.equal(await panel.evaluate(e => e.getAnimations().filter(a => a.playState === "running").length), 0);
    await panel.getByRole("link").first().focus();
    await page.keyboard.press("Escape"); await settled(panel); assert.equal((await state(panel)).visibility, "hidden");
  } else await mobileMenu(page, true);
  await details(page, locale, true); await focusDuringDetailsOpening(page); await anchorsAndCards(page, locale, true);
  // Switching preference during an active transition must cancel movement and
  // preserve the logical open state, rather than hiding content via stale work.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  if (width < 768) {
    const button = nav.locator('button[aria-controls="mobile-navigation-panel"]'); await button.click();
    await page.emulateMedia({ reducedMotion: "reduce" }); const panel = byId(page, "mobile-navigation-panel"); await settled(panel);
    assert.equal(await button.getAttribute("aria-expanded"), "true"); assert.equal((await state(panel)).inert, false); assert.equal((await state(panel)).opacity, 1);
    await page.keyboard.press("Escape"); await settled(panel);
  } else {
    const blog = nav.getByRole("link", { name: "Blog", exact: true }), id = await blog.getAttribute("aria-controls"), panel = byId(page, id);
    await page.mouse.move(5, 950); await blog.hover(); await page.emulateMedia({ reducedMotion: "reduce" }); await settled(panel);
    assert.equal((await state(panel)).inert, false); assert.equal((await state(panel)).opacity, 1);
    await panel.getByRole("link").first().focus(); await page.keyboard.press("Escape"); await settled(panel);
  }
  steps.push({ scenario: current, action: "prefers-reduced-motion-live-switch-and-zero-motion", pass: true });
}
async function localeRoundtrip(page, locale, width) {
  const next = locale === "en" ? "es-co" : "en", before = new URL(page.url()).pathname;
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  if (width < 768 && await nav.getByRole("button", { name: "Open menu", exact: true }).isVisible()) await nav.getByRole("button", { name: "Open menu", exact: true }).click();
  const label = next === "en" ? "Switch to English" : "Switch to Spanish";
  await nav.getByRole("button", { name: label, exact: true }).filter({ visible: true }).click();
  await page.waitForURL(u => u.pathname === (next === "en" ? "/" : "/es-co"), { waitUntil: "commit" }); await ready(page, next);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.jhonattan.dev" + (next === "en" ? "" : "/es-co"));
  steps.push({ scenario: current, action: "locale-navigation-preserved", pass: true, from: before, to: new URL(page.url()).pathname });
}

async function legacyFixture() {
  if (process.env.MOTION_LEGACY_FIXTURE !== "true") {
    steps.push({ action: "legacy-project-filters", status: "NOT_RUN_LOCAL_FIXTURE_NOT_REQUESTED", homeHasFilters: false }); return;
  }
  current = "offline-legacy-filter-fixture";
  const { c, page } = await context();
  assert.equal((await page.goto(target.origin + "/motion-lab", { waitUntil: "domcontentloaded" })).status(), 200);
  await page.locator('[data-motion-fixture-ready="true"]').waitFor();
  const list = page.locator(".motion-project-list");
  assert.equal(await list.locator(":scope > li").count(), 4);
  const radio = value => page.locator(`label:has(input[name="project-tag"][value=${JSON.stringify(value)}])`);
  const retained = list.locator(":scope > li").filter({ has: page.getByRole("heading", { name: "Local fixture 3", exact: true }) });
  await retained.evaluate(e => e.getBoundingClientRect());
  await radio("web").click();
  await page.waitForFunction(() => document.querySelectorAll(".motion-project-list > li").length === 2);
  assert.deepEqual(await list.getByRole("heading").allTextContents(), ["Local fixture 1", "Local fixture 3"]);
  const positions = await retained.evaluate(async e => {
    const rows = [], deadline = performance.now() + 1000; let moved = false;
    for (;;) {
      const transform = getComputedStyle(e).transform;
      const moving = [...document.querySelectorAll(".motion-project-list > li")].filter(n => getComputedStyle(n).transform !== "none").length;
      rows.push({ transform, moving });
      if (transform !== "none") moved = true;
      if (moved && transform === "none" || performance.now() > deadline || !moved && rows.length >= 15) break;
      await new Promise(requestAnimationFrame);
    }
    return rows;
  });
  assert.ok(positions.some(x => x.transform !== "none"), "EXISTING_FILTER_RETAINS_SUBTLE_LAYOUT_MOTION");
  assert.ok(positions.every(x => x.moving <= 4), "FILTER_MOTION_FAN_OUT_BOUNDED");
  for (const [tag, titles] of [["accessibility", ["Local fixture 3", "Local fixture 4"]], ["ecommerce", ["Local fixture 2", "Local fixture 4"]], ["all", ["Local fixture 1", "Local fixture 2", "Local fixture 3", "Local fixture 4"]]]) {
    await radio(tag).click();
    await page.waitForFunction(count => document.querySelectorAll(".motion-project-list > li").length === count, titles.length);
    assert.deepEqual(await list.getByRole("heading").allTextContents(), titles);
  }
  await page.emulateMedia({ reducedMotion: "reduce" }); await radio("web").click();
  await page.waitForFunction(() => document.querySelectorAll(".motion-project-list > li").length === 2);
  const reduced = await list.evaluate(async e => {
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    return [...e.children].map(n => ({ transform: getComputedStyle(n).transform, opacity: getComputedStyle(n).opacity }));
  });
  assert.ok(reduced.every(x => x.transform === "none" && x.opacity === "1"), "REDUCED_FILTER_NO_MOVEMENT_OR_HIDDEN_CARDS");
  await shot(page, "offline-legacy-filter-fixture"); await c.close();
  const noJs = await context({ javascript: false });
  assert.equal((await noJs.page.goto(target.origin + "/motion-lab", { waitUntil: "domcontentloaded" })).status(), 200);
  const ssr = await noJs.page.locator(".motion-project-list > li").evaluateAll(items => items.map(e => ({ opacity: getComputedStyle(e).opacity, visible: !!e.getClientRects().length })));
  assert.equal(ssr.length, 4); assert.ok(ssr.every(x => x.visible && x.opacity === "1"), "LEGACY_SSR_NO_JS_CARDS_READABLE"); await noJs.c.close();
  steps.push({ scenario: current, action: "legacy-project-filters-existing-component", pass: true, source: "Synthetic offline four-item fixture at snapshot-only /motion-lab; not published CMS or Home V2", retainedPositions: positions, reduced, noJavascript: ssr });
}

try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || "/opt/google/chrome/chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const matrix = [["light", 1440, "en"], ["dark", 1440, "es-co"], ["light", 390, "es-co"], ["dark", 390, "en"]];
  const requested = process.env.MOTION_CASES?.split(",");
  if (requested) assert.ok(requested.every(key => matrix.some(row => row.join("-") === key)), "UNKNOWN_MOTION_CASE");
  for (const [theme, width, locale] of matrix.filter(row => !requested || requested.includes(row.join("-")))) {
    current = `${theme}-${width}-${locale}`;
    const { c, page } = await context({ theme, width, locale }); await gotoHome(page, locale);
    const tokens = await page.evaluate(() => Object.fromEntries(["--motion-fast", "--motion-normal", "--motion-slow", "--motion-ease"].map(k => [k, getComputedStyle(document.documentElement).getPropertyValue(k).trim()])));
    for (const [key, value] of [["--motion-fast", 160], ["--motion-normal", 220], ["--motion-slow", 280]]) assert.equal(milliseconds(tokens[key]), value, "SHARED_DURATION_TOKEN:" + key);
    const stop = theme === "light" ? await recorder(page, "motion-" + width) : null;
    const phases = process.env.MOTION_PHASES?.split(",") || ["menus", "details", "focus", "anchors", "reduced", "locale"];
    assert.ok(phases.every(p => ["menus", "details", "focus", "anchors", "reduced", "locale"].includes(p)), "UNKNOWN_MOTION_PHASE");
    if (phases.includes("menus")) {
      if (width >= 768) { await dropdown(page, locale, false); await themeMenu(page, page.getByRole("navigation", { name: "Primary", exact: true }), false); }
      else await mobileMenu(page, false);
    }
    if (phases.includes("details")) await details(page, locale, false);
    if (phases.includes("focus")) await focusDuringDetailsOpening(page);
    if (phases.includes("anchors")) await anchorsAndCards(page, locale, false);
    await shot(page, current + "-normal");
    if (stop) await stop();
    if (phases.includes("reduced")) { await reducedChecks(page, locale, width); await shot(page, current + "-reduced"); }
    if (phases.includes("locale")) await localeRoundtrip(page, locale, width);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false);
    scenarios.push({ theme, width, locale, normalMotion: phases.filter(p => ["menus", "details", "focus", "anchors"].includes(p)), reducedMotion: phases.includes("reduced"), localeNavigation: phases.includes("locale"), overflow, tokens });
    await c.close();
  }
  await legacyFixture();
  current = "no-javascript-native";
  const { c, page } = await context({ javascript: false, reduced: true }); await gotoHome(page, "en", false);
  const native = page.locator(".home-v2-credentials details").first(), summary = native.locator("summary"); await summary.scrollIntoViewIfNeeded();
  await summary.focus(); await page.keyboard.press("Enter"); assert.equal(await native.getAttribute("open"), "");
  assert.equal(await native.locator(":scope > :not(summary)").first().isVisible(), true);
  assert.equal(await native.locator(":scope > :not(summary)").first().evaluate(e => e.inert), false, "NO_JS_CONTENT_NOT_INERT");
  await page.keyboard.press("Enter"); assert.equal(await native.getAttribute("open"), null);
  await page.locator('a[href="#home"]').click(); await page.waitForURL(u => u.hash === "#home", { waitUntil: "commit" });
  await shot(page, "no-javascript-native-details"); steps.push({ scenario: current, action: "native-details-keyboard-and-anchor-without-javascript", pass: true }); await c.close();
  assert.deepEqual(errors, [], "APPLICATION_JAVASCRIPT_ERRORS");
  assert.deepEqual(analytics, [], "ANALYTICS_REQUESTS");
  const localConsole = consoleErrors.filter(e => !["www.google.com", "www.gstatic.com", "csp.withgoogle.com"].includes(e.host)); assert.deepEqual(localConsole, [], "APPLICATION_CONSOLE_ERRORS");
  status = "PASS";
} catch (error) {
  failure = { scenario: current, name: error.name, message: safe(error.message).slice(0, 600), stack: safe(error.stack || "").slice(0, 1800) };
  failure.geometry = await activePage?.evaluate(() => ({ pathname: location.pathname, hash: location.hash, y: scrollY, height: innerHeight, scrollHeight: document.documentElement.scrollHeight, htmlBehavior: getComputedStyle(document.documentElement).scrollBehavior, bodyBehavior: getComputedStyle(document.body).scrollBehavior, sections: [...document.querySelectorAll("#projects,#about,#contact")].map(e => ({ id: e.id, top: e.getBoundingClientRect().top, margin: getComputedStyle(e).scrollMarginTop })), navLinks: [...document.querySelectorAll('nav[aria-label="Primary"] a[href*="#"]')].map(e => e.getAttribute("href")) })).catch(() => null);
  await activePage?.screenshot({ path: join(output, "failure.png"), animations: "allow" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  await save("results.json", { status, origin: target.origin, buildId: process.env.MOTION_BUILD_ID || null, scenarios, steps, samples, recordings, failure, errors, consoleErrors, failedRequests, blocked, analytics, cmsMutations: 0, formsSubmitted: 0, limits: ["Local Chromium only; no production or CMS writes.", "Ten fast state reversals per tested transient control, not a claim of ten CI suite runs.", "No Home project filter is invented. Any legacy filter fixture is separately labelled.", "Layout box invariance is tested for card hover; expanding native details intentionally changes document height."] });
  const files = [];
  async function collect(directory) { for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); if (entry.isDirectory()) await collect(path); else if (entry.name !== "evidence-manifest.json") { const bytes = await readFile(path); files.push({ path: path.slice(output.length + 1), bytes: bytes.length, sha256: sha(bytes) }); } } }
  await collect(output); await save("evidence-manifest.json", { files });
}
console.log(JSON.stringify({ status, scenarios: scenarios.length, steps: steps.length, recordings: recordings.length, failure, output }));
