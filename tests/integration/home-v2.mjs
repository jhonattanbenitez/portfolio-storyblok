import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_V2_COPY } from "../../lib/home-v2.ts";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const originUrl = new URL(process.env.HOME_V2_ORIGIN || "http://127.0.0.1:3000");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(originUrl.hostname), "LOCAL_ORIGIN_REQUIRED");
assert.ok(["http:", "https:"].includes(originUrl.protocol) && !originUrl.username && !originUrl.password && !originUrl.search, "UNSAFE_ORIGIN");
const origin = originUrl.origin;
const publicOrigin = "https://www.jhonattan.dev";
const output = resolve(process.env.HOME_V2_EVIDENCE_DIR || join(repository, "artifacts/home-v2", `final-${Date.now()}-${process.pid}`));
assert.ok(!output.startsWith(join(repository, "public") + "/"), "EVIDENCE_MUST_NOT_BE_PUBLIC");
await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, "EVIDENCE_DIRECTORY_MUST_BE_NEW");
const sha = value => createHash("sha256").update(value).digest("hex");
const writeJson = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2));
const sanitize = value => String(value).replace(/([?&](?:token|secret|password|access_token)=)[^\s&#]+/gi, "$1[REDACTED]");
const buildId = process.env.HOME_V2_BUILD_ID || null;
const sourceManifest = process.env.HOME_V2_SOURCE_MANIFEST;
if (sourceManifest) {
  const manifest = JSON.parse(await readFile(sourceManifest, "utf8"));
  for (const file of manifest.files) assert.equal(sha(await readFile(join(manifest.candidate, file.path))), file.sha256, `CANDIDATE_CHANGED:${file.path}`);
}
const executablePath = process.env.BROWSER_EXECUTABLE || ["/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
assert.ok(executablePath, "CHROMIUM_EXECUTABLE_UNAVAILABLE");
const spanishCase = "/es-co/case-studies/optimizacion-logistica-y-financiera-para-negocios-de-domicilios-un-sistema-de-gestion-a-medida";
const rows = [], interactions = [], browserErrors = [], consoleErrors = [], failedRequests = [], mutations = [], analyticsRequests = [], blockedProviderReports = [];
let current = "launch", browser, activePage, outcome = "FAIL", failure = null;
const safePath = url => { try { return new URL(url).pathname; } catch { return "INVALID_URL"; } };

async function contextFor(scheme, width, locale, reduced = false) {
  const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 1050 : 844 }, colorScheme: scheme, locale: locale === "en" ? "en-US" : "es-CO", reducedMotion: reduced ? "reduce" : "no-preference" });
  // Defaults only: later theme/consent choices survive reloads and navigation.
  await context.addInitScript(({ theme }) => {
    if (localStorage.getItem("theme") === null) localStorage.setItem("theme", theme);
    if (localStorage.getItem("analytics-consent-v1") === null) localStorage.setItem("analytics-consent-v1", "denied");
  }, { theme: scheme });
  await context.route("**/*", route => {
    const request = route.request(), url = new URL(request.url());
    if (["www.googletagmanager.com", "www.google-analytics.com", "region1.google-analytics.com", "analytics.google.com"].includes(url.hostname)) {
      analyticsRequests.push({ hostname: url.hostname, path: url.pathname }); return route.abort();
    }
    if (!["GET", "HEAD"].includes(request.method())) {
      // reCAPTCHA may POST a browser CSP report. Block and record it separately
      // from application submissions; no remote writes are permitted by this QA.
      const entry = { method: request.method(), hostname: url.hostname, path: url.pathname };
      if (request.method() === "POST" && url.hostname === "csp.withgoogle.com" && url.pathname.startsWith("/csp/")) blockedProviderReports.push(entry);
      else mutations.push(entry);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", error => browserErrors.push({ scenario: current, name: error.name, message: sanitize(error.message) }));
  page.on("console", message => {
    if (message.type() === "error") {
      let sourceHost = ""; try { sourceHost = new URL(message.location().url).hostname; } catch { /* Browser messages need not have a source URL. */ }
      consoleErrors.push({ scenario: current, message: sanitize(message.text()), sourcePath: safePath(message.location().url), sourceHost });
    }
  });
  page.on("requestfailed", request => failedRequests.push({ scenario: current, hostname: new URL(request.url()).hostname, path: safePath(request.url()), reason: request.failure()?.errorText || "UNKNOWN" }));
  return { context, page };
}

async function homeReady(page, locale) {
  await page.getByRole("heading", { level: 1, name: HOME_V2_COPY[locale].headline, exact: true }).waitFor();
  await page.locator('button[aria-label="Toggle theme"]').waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getByRole("main").count(), 1, "SINGLE_MAIN_REQUIRED");
  assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1, "SINGLE_HOME_H1_REQUIRED");
  assert.equal(await page.locator("html").getAttribute("lang"), locale === "en" ? "en" : "es-CO", "HTML_LANGUAGE_CHANGED");
}

async function noOverflow(page) {
  const result = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
  assert.ok(result.documentWidth <= result.width + 1, `HORIZONTAL_OVERFLOW:${result.documentWidth}/${result.width}`); return result;
}

async function textReflow(page) {
  const data = await page.evaluate(() => ({
    rootFont: getComputedStyle(document.documentElement).fontSize,
    overflow: [...document.querySelectorAll("main.home-v2 h1, main.home-v2 h2, main.home-v2 h3, main.home-v2 p, main.home-v2 a, main.home-v2 summary")]
      .filter(element => element.getClientRects().length && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1)
      .map(element => ({ tag: element.tagName, className: element.className, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
  }));
  assert.equal(data.rootFont, "32px", "TEXT_RESIZE_PREFERENCE_NOT_APPLIED");
  assert.deepEqual(data.overflow, [], "TEXT_CLIPPED_INSIDE_LAYOUT"); return data;
}

async function decodeVisibleImages(page) {
  const images = page.locator("main.home-v2 img"); let count = 0;
  for (const image of await images.all()) {
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(element => element.decode());
    assert.ok(await image.evaluate(element => element.complete && element.naturalWidth > 0), "REAL_IMAGE_FAILED"); count++;
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY === 0); return count;
}

async function metadata(page, locale) {
  const path = locale === "en" ? "/" : "/es-co";
  assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
  // The existing SEO contract intentionally omits a trailing slash on the root.
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), publicOrigin + (path === "/" ? "" : path));
  for (const [language, href] of [["en", "/"], ["es-CO", "/es-co"], ["x-default", "/"]]) {
    assert.equal(await page.locator(`link[rel="alternate"][hreflang="${language}"]`).getAttribute("href"), publicOrigin + (href === "/" ? "" : href));
  }
  const structured = page.locator('script[type="application/ld+json"]');
  assert.ok(await structured.count() > 0);
  for (const script of await structured.all()) JSON.parse(await script.textContent());
}

async function inspectHome(page, locale, width) {
  const copy = HOME_V2_COPY[locale];
  for (const id of ["home", "projects", "expertise", "writing", "about", "contact", "case-studies"]) assert.equal(await page.locator(`[id="${id}"]`).count(), 1, `ANCHOR:${id}`);
  assert.equal(await page.locator(".home-v2-work-grid article").count(), 3);
  assert.equal(await page.locator(".home-v2-more-grid article").count(), 4, "EXISTING_WORK_LOST");
  assert.equal(await page.locator(".home-v2-credentials details").count(), 4, "BIOGRAPHY_AND_THREE_CREDENTIAL_GROUPS_REQUIRED");
  const biography = page.locator(".home-v2-background");
  assert.equal(await biography.getAttribute("open"), null, "BIOGRAPHY_SHOULD_START_COLLAPSED");
  assert.ok((await biography.locator(".home-v2-biography").textContent()).trim().length > 0, "BIOGRAPHY_LOST");
  const technologyLabels = await page.locator(".home-v2-technologies").evaluateAll(lists => lists.map(list => list.getAttribute("aria-label")));
  assert.ok(technologyLabels.every(label => label === (locale === "en" ? "Technologies" : "Tecnologías")), "TECHNOLOGY_LABEL_NOT_LOCALIZED");
  const writing = await page.locator(".home-v2-writing-list article").evaluateAll(elements => elements.map(element => ({ href: element.querySelector("h3 a")?.getAttribute("href"), title: element.querySelector("h3")?.textContent, date: element.querySelector("time")?.getAttribute("datetime") })));
  assert.equal(writing.length, 3, "THREE_PUBLISHED_ARTICLES_REQUIRED");
  const writingMetadata = await page.locator(".home-v2-writing-list article").evaluateAll(articles => articles.map(article =>
    [...article.querySelectorAll(".home-v2-writing-meta li")].map(item => item.textContent.trim())));
  for (const items of writingMetadata) {
    assert.equal(items.length, 2, "EXISTING_CATEGORY_AND_READING_ESTIMATE_REQUIRED_FOR_REAL_ARTICLES");
    assert.ok(items[0].length > 0);
    assert.match(items[1], /^[1-9]\d* /);
    assert.ok(items[1].endsWith(copy.readingEstimate), "READING_ESTIMATE_MUST_BE_EXPLICIT");
  }
  const workFacts = await page.locator(".home-v2-work-grid article").first().locator(".home-v2-work-facts dt").allTextContents();
  assert.deepEqual(workFacts, locale === "en" ? ["Problem", "Solution", "Outcome"] : ["Problema", "Solución", "Resultado"], "PUBLISHED_CASE_FACTS_MISSING");
  assert.equal(new Set(writing.map(row => row.href)).size, 3, "DUPLICATED_ARTICLE_LINK");
  for (const row of writing) {
    assert.ok(row.href.startsWith(locale === "en" ? "/posts/" : "/es-co/posts/"));
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(Date.parse(row.date)));
    assert.ok(!row.href.includes("i18n-pilot") && !row.href.includes("i18n-piloto"));
  }
  assert.deepEqual(writing.map(row => row.date), writing.map(row => row.date).sort().reverse(), "LATEST_EDITORIAL_ORDER_CHANGED");
  const caseLink = page.locator(".home-v2-work-grid article").first().getByRole("link").first();
  const caseHref = await caseLink.getAttribute("href");
  assert.ok(caseHref.startsWith(locale === "en" ? "/case-studies/" : "/es-co/case-studies/"));
  if (locale === "es-co") assert.equal(caseHref, spanishCase, "SPANISH_CASE_DOUBLE_FLIP_REGRESSION");
  const caseTitle = await page.locator(".home-v2-work-grid article").first().getByRole("heading", { level: 3 }).innerText();
  const social = page.locator(".home-v2-socials a");
  assert.deepEqual(await social.evaluateAll(links => links.map(link => new URL(link.href).hostname)), ["www.linkedin.com", "github.com", "www.fiverr.com"]);
  for (const link of await social.all()) assert.ok(/noopener/.test(await link.getAttribute("rel")));
  const form = page.locator("#contact form");
  assert.equal(await form.count(), 1);
  for (const name of ["name", "email", "message"]) {
    const input = form.locator(`[name="${name}"]`); assert.equal(await input.getAttribute("required"), "");
    const label = page.locator(`#contact label[for="${name}"]`); assert.ok(await label.isVisible());
    const box = await label.boundingBox(); assert.ok(box.width > 1 && box.height > 1, "LABEL_NOT_VISUALLY_AVAILABLE");
  }
  const imageCount = await decodeVisibleImages(page);
  const dimensions = await noOverflow(page);
  const heading = page.getByRole("heading", { level: 1, name: copy.headline, exact: true });
  const [titleBox, navBox] = await Promise.all([heading.boundingBox(), page.locator(".home-v2-nav").boundingBox()]);
  assert.ok(titleBox.y >= navBox.y + navBox.height, "FIXED_NAV_OBSCURES_HERO");
  assert.equal(await page.locator("#consented-analytics").count(), 0);
  const credentialMarker = await page.evaluate(() => /STORYBLOK_PREVIEW_TOKEN|STORYBLOK_DRAFT_SECRET|Authorization:\s*Bearer|[?&](?:token|preview_token|access_token)=/i.test(document.documentElement.outerHTML));
  assert.equal(credentialMarker, false, "PRIVATE_CREDENTIAL_MARKER_IN_HTML");
  if (width < 768) assert.ok(await page.getByRole("button", { name: "Open menu", exact: true }).isVisible());
  return { writing, writingMetadata, workFacts, caseHref, caseTitle, imageCount, dimensions, anchors: true, credentialsVisible: true };
}

try {
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [1440, 390]) for (const locale of ["en", "es-co"]) for (const scheme of ["light", "dark"]) {
    current = `${locale}-${scheme}-${width === 1440 ? "desktop" : "mobile"}`;
    const { context, page } = await contextFor(scheme, width, locale); const started = Date.now();
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    try {
      const response = await page.goto(origin + (locale === "en" ? "/" : "/es-co"), { waitUntil: "domcontentloaded" }); assert.equal(response.status(), 200);
      await homeReady(page, locale); const readyMs = Date.now() - started;
      await metadata(page, locale); const checks = await inspectHome(page, locale, width);
      await page.screenshot({ path: join(output, current + ".png"), fullPage: true, animations: "disabled" });
      rows.push({ scenario: current, locale, scheme, width, status: 200, initialHeadlineReadyMs: readyMs, ...checks });
    } catch (error) {
      await page.screenshot({ path: join(output, current + "-failure.png"), fullPage: true }).catch(() => {}); throw error;
    } finally { await context.tracing.stop({ path: join(output, current + "-trace.zip") }); await context.close(); }
  }

  current = "responsive-and-interactions";
  const { context, page } = await contextFor("light", 390, "en", true);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  try {
    await page.goto(origin); await homeReady(page, "en");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("href")), "#home-v2-main", "SKIP_LINK_NOT_FIRST");
    await page.screenshot({ path: join(output, "keyboard-skip-focus.png") });
    await page.keyboard.press("Enter"); await page.waitForFunction(() => document.activeElement?.id === "home-v2-main");
    const more = page.locator(".home-v2-more-work");
    await more.locator("summary").focus(); await page.keyboard.press("Enter"); assert.equal(await more.getAttribute("open"), "");
    assert.equal(await more.locator("article").count(), 4); await page.keyboard.press("Enter"); assert.equal(await more.getAttribute("open"), null);
    for (const details of await page.locator(".home-v2-credentials details").all()) {
      await details.locator("summary").focus(); await page.keyboard.press("Enter"); assert.equal(await details.getAttribute("open"), "");
      if (await details.evaluate(element => element.classList.contains("home-v2-background"))) {
        assert.ok(await details.locator(".home-v2-biography").isVisible());
      } else {
        assert.ok(await details.locator("li").count() > 0);
      }
      await page.keyboard.press("Enter");
    }
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("button", { name: "Close menu", exact: true }).waitFor();
    await page.screenshot({ path: join(output, "mobile-menu.png") });
    await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Open menu", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Open menu", exact: true }).evaluate(button => button === document.activeElement), true, "MOBILE_ESCAPE_FOCUS_NOT_RESTORED");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.locator("#mobile-navigation-panel").getByRole("button", { name: "Switch to Spanish", exact: true }).click();
    await page.waitForURL(origin + "/es-co"); await homeReady(page, "es-co");
    if (await page.getByRole("button", { name: "Close menu", exact: true }).isVisible()) await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.locator("#mobile-navigation-panel").getByRole("button", { name: "Toggle theme", exact: true }).click();
    await page.locator("#mobile-navigation-panel").getByRole("button", { name: "Dark", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
    await page.keyboard.press("Escape");
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 950 }); await noOverflow(page);
      await page.screenshot({ path: join(output, `es-co-dark-${width}.png`), fullPage: true, animations: "disabled" });
    }
    const reflowResults = [];
    for (const locale of ["en", "es-co"]) for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin + (locale === "en" ? "/" : "/es-co")); await homeReady(page, locale);
      await page.evaluate(() => document.documentElement.style.fontSize = "200%");
      await page.waitForFunction(() => {
        const header = document.querySelector(".home-v2-nav > div:first-child");
        const measured = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--home-v2-nav-height"));
        return header && Math.abs(header.getBoundingClientRect().height - measured) <= 1;
      });
      const dimensions = await noOverflow(page), text = await textReflow(page);
      await decodeVisibleImages(page);
      if (width === 320 || locale === "es-co") await page.screenshot({ path: join(output, `${locale}-text-resize-200-percent-${width}.png`), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.locator("#mobile-navigation-panel").getByRole("button", { name: "Toggle theme", exact: true }).click();
      const themeOptions = await page.locator("#mobile-navigation-panel").getByRole("button", { name: /^(Light|Dark|System)$/ }).evaluateAll(options => options.map(element => ({ text: element.textContent.trim(), left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom })));
      assert.equal(themeOptions.length, 3);
      assert.ok(themeOptions.every(option => option.left >= 0 && option.right <= width && option.top >= 0 && option.bottom <= 1000), "ENLARGED_THEME_OPTIONS_CLIPPED");
      await page.screenshot({ path: join(output, `${locale}-theme-menu-${width}-200-percent.png`), animations: "disabled" });
      await page.keyboard.press("Escape");
      reflowResults.push({ locale, width, dimensions, text, themeOptions });
    }
    await writeJson("reflow.json", reflowResults);
    await page.evaluate(() => document.documentElement.style.fontSize = "");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), "auto", "REDUCED_MOTION_SCROLL_NOT_RESPECTED");
    await page.setViewportSize({ width: 390, height: 844 });
    const form = page.locator("#contact form");
    await form.getByRole("button", { name: /Enviar|Send/i }).click();
    assert.equal(await form.evaluate(element => element.checkValidity()), false);
    assert.equal(await form.locator('[name="name"]').evaluate(input => input.validity.valueMissing), true);
    await form.locator('[name="name"]').fill("Local QA"); await form.locator('[name="email"]').fill("not-an-email"); await form.locator('[name="message"]').fill("Local validation only; do not send.");
    await form.getByRole("button", { name: /Enviar|Send/i }).click();
    assert.equal(await form.locator('[name="email"]').evaluate(input => input.validity.typeMismatch), true);
    await page.screenshot({ path: join(output, "contact-invalid-only.png"), fullPage: true, animations: "disabled" });
    assert.equal(mutations.length, 0, "FORM_SUBMITTED_DURING_NEGATIVE_VALIDATION");
    await page.evaluate(() => localStorage.setItem("analytics-consent-v1", "granted")); await page.reload(); await homeReady(page, "es-co");
    assert.equal(await page.evaluate(() => localStorage.getItem("analytics-consent-v1")), "granted");
    assert.equal(await page.locator("#consented-analytics").count(), 0); assert.equal(analyticsRequests.length, 0);
    const writingHref = await page.locator(".home-v2-writing-list h3 a").first().getAttribute("href");
    await page.locator(".home-v2-writing-list h3 a").first().click(); await page.waitForURL(origin + writingHref);
    assert.equal(await page.locator(".home-v2").count(), 0, "HOME_STYLE_LEAKED_TO_ARTICLE");
    assert.equal(await page.locator(".home-v2-nav").count(), 0, "HOME_NAV_STYLE_LEAKED_TO_ARTICLE");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), publicOrigin + writingHref);
    await page.goto(origin + "/es-co"); await homeReady(page, "es-co");
    const caseLink = page.locator(".home-v2-work-grid article").first().getByRole("link").first();
    assert.equal(await caseLink.getAttribute("href"), spanishCase); await caseLink.click(); await page.waitForURL(origin + spanishCase);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), publicOrigin + spanishCase);
    assert.equal(await page.locator(".home-v2").count(), 0);
    interactions.push({ skipKeyboard: true, workDisclosurePreserved: true, credentialsKeyboard: true, mobileMenuEscapeFocus: true, languageSwitch: true, themeSwitch: true, viewport320: true, viewport768: true, textResize200PercentAt320And390ENES: true, reducedMotion: true, formRequiredAndEmailNegativeOnly: true, realEmailSent: false, consentGrantedReloadNoAnalytics: true, articleAndSpanishCaseNavigation: true, blogAndDetailHomeStylingAbsent: true });
  } catch (error) {
    await page.screenshot({ path: join(output, "interactions-failure.png"), fullPage: true }).catch(() => {}); throw error;
  } finally { await context.tracing.stop({ path: join(output, "interactions-trace.zip") }); await context.close(); }
  current = "sitemap";
  const response = await fetch(origin + "/sitemap.xml"); assert.equal(response.status, 200);
  const xml = await response.text(); const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, 45); assert.equal(new Set(urls).size, 45);
  assert.equal(urls.filter(url => /\/(?:es-co\/)?posts\//.test(new URL(url).pathname)).length, 30);
  assert.ok(urls.every(url => new URL(url).origin === publicOrigin && !/i18n-pilot|i18n-piloto/.test(url)));
  assert.equal(analyticsRequests.length, 0); assert.equal(mutations.length, 0); assert.equal(browserErrors.length, 0);
  const knownProviderHosts = ["www.google.com", "www.gstatic.com", "recaptcha.net", "www.recaptcha.net"];
  const applicationConsoleErrors = consoleErrors.filter(row => !knownProviderHosts.includes(row.sourceHost) && !row.message.startsWith("Console Ninja failed to send logs"));
  const criticalFailedRequests = failedRequests.filter(row => row.reason !== "net::ERR_ABORTED" && !knownProviderHosts.includes(row.hostname)
    && !blockedProviderReports.some(report => report.hostname === row.hostname && report.path === row.path));
  assert.deepEqual(applicationConsoleErrors, [], "APPLICATION_CONSOLE_ERROR");
  assert.deepEqual(criticalFailedRequests, [], "CRITICAL_REQUEST_FAILED");
  outcome = "PASS_LOCAL_HOME_V2";
} catch (error) {
  failure = { step: current, name: error.name, message: sanitize(error.message), stack: sanitize(error.stack || "") }; process.exitCode = 1;
  await activePage?.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  await writeJson("results.json", { schema: 1, outcome, failure, origin, buildId, dataMode: "Published CMS through existing application facade; no browser data mocks", sourceManifestSha256: sourceManifest ? sha(await readFile(sourceManifest)) : null, harnessSha256: sha(await readFile(fileURLToPath(import.meta.url))), rows, interactions, browserErrors, consoleErrors, failedRequests, mutationAttempts: mutations, blockedProviderReports, analyticsRequests, sitemapUniqueUrls: outcome === "PASS_LOCAL_HOME_V2" ? 45 : null, productionVisited: false, cmsWrites: 0, realEmailsSent: 0, fullWcagCertification: false });
}
console.log(JSON.stringify({ outcome, failure: failure && { step: failure.step, message: failure.message }, scenarios: rows.length, output }));
