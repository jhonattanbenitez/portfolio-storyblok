import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const url = new URL(process.env.NAV_PALETTE_ORIGIN || "http://127.0.0.1:3000");
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search,
  "LOCAL_ORIGIN_REQUIRED",
);
const mode = process.env.NAV_PALETTE_MODE || "after";
assert.ok(["before", "after"].includes(mode));
const output = resolve(
  process.env.NAV_PALETTE_OUTPUT ||
    `artifacts/home-v2/navigation-palette/${mode}`,
);
assert.ok(!output.includes("/public/"), "PRIVATE_EVIDENCE_REQUIRED");
await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, "NEW_OUTPUT_REQUIRED");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const baseline = process.env.NAV_PALETTE_BASELINE
  ? JSON.parse(await readFile(process.env.NAV_PALETTE_BASELINE, "utf8"))
  : null;
const rows = [],
  interactions = [],
  errors = [],
  consoleErrors = [],
  analytics = [],
  blocked = [];
let browser,
  active,
  status = "FAIL",
  failure;
const article =
  "/posts/the-power-of-functions-in-javascript-reusability-and-higher-order-functions";
const palette = {
  light: {
    background: "#f6f5f1",
    surface: "#ffffff",
    text: "#172b30",
    secondary: "#526267",
    accent: "#1f626b",
  },
  dark: {
    background: "#0c171a",
    surface: "#122226",
    text: "#e8efed",
    secondary: "#a4b6b6",
    accent: "#80c2c8",
  },
};
function rgb(s) {
  const v = s.match(/[\d.]+/g)?.map(Number);
  return v?.length >= 3 ? v.slice(0, 3) : null;
}
function hex(s) {
  const v = rgb(s);
  return v
    ? "#" + v.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
    : s;
}
function contrast(f, b) {
  const lum = (c) =>
    rgb(c)
      .map((n) => n / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
      .reduce((a, n, i) => a + n * [0.2126, 0.7152, 0.0722][i], 0);
  const a = lum(f),
    z = lum(b);
  return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05);
}
const css = (element) => {
  const s = getComputedStyle(element);
  let p = element,
    bg;
  while (p) {
    const b = getComputedStyle(p).backgroundColor;
    if (!b.includes("rgba") && !b.includes("transparent")) {
      bg = b;
      break;
    }
    p = p.parentElement;
  }
  return {
    color: s.color,
    background: s.backgroundColor,
    effectiveBackground: bg || "rgb(255, 255, 255)",
    border: s.borderColor,
    outline: s.outline,
    outlineColor: s.outlineColor,
    outlineWidth: s.outlineWidth,
    boxShadow: s.boxShadow,
    opacity: s.opacity,
    disabled: element.disabled === true,
    focusVisible: element.matches(":focus-visible"),
  };
};
async function shot(page, name, clip) {
  await page.locator("img").evaluateAll(async (items) => {
    for (const image of items) {
      const r = image.getBoundingClientRect();
      if (
        r.width > 0 &&
        r.height > 0 &&
        r.top < innerHeight &&
        r.bottom > 0 &&
        r.left < innerWidth &&
        r.right > 0
      )
        await image.decode();
    }
  });
  await page.screenshot({
    path: output + "/" + name + ".png",
    animations: "disabled",
    ...(clip ? { clip } : { fullPage: false }),
  });
}
async function styles(locator) {
  return locator.evaluate(css);
}
async function languageGeometry(button) {
  const geometry = await button.evaluate((element) => {
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    return { button: rect(element), wrapper: rect(element.closest(".nav-language-switcher")) };
  });
  const { button: b, wrapper: w } = geometry;
  assert.ok(b.left >= w.left - 1 && b.right <= w.right + 1 && b.top >= w.top - 1 && b.bottom <= w.bottom + 1, "LANGUAGE_BUTTON_CONTAINED_IN_WRAPPER");
  return geometry;
}
async function save(name, v) {
  await writeFile(output + "/" + name, JSON.stringify(v, null, 2), {
    mode: 0o600,
  });
}
async function ready(page, theme) {
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .waitFor();
  await page
    .locator('[aria-label="Toggle theme"]')
    .first()
    .waitFor({ state: "attached" });
  await page.waitForFunction(
    (t) => document.documentElement.classList.contains(t),
    theme,
  );
  await page.evaluate(() => document.fonts.ready);
}
async function context(theme, width) {
  const c = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  await c.addInitScript(
    ({ theme }) => {
      if (localStorage.getItem("theme") === null)
        localStorage.setItem("theme", theme);
      localStorage.setItem("analytics-consent-v1", "denied");
    },
    { theme },
  );
  await c.route("**/*", (route) => {
    const r = route.request(),
      u = new URL(r.url());
    if (/google-analytics|googletagmanager/.test(u.hostname)) {
      analytics.push({ host: u.hostname, path: u.pathname });
      return route.abort();
    }
    if (
      !["GET", "HEAD"].includes(r.method()) ||
      (u.origin === url.origin &&
        /^\/(?:api|live-preview)(?:\/|$)/.test(u.pathname))
    ) {
      blocked.push({ method: r.method(), host: u.hostname, path: u.pathname });
      return route.abort();
    }
    return route.continue();
  });
  return c;
}
function listen(page) {
  page.on("pageerror", (e) =>
    errors.push({
      name: e.name,
      message: e.message.replace(/https?:\/\/\S+/g, "[URL]"),
    }),
  );
  page.on("console", (m) => {
    if (m.type() === "error")
      consoleErrors.push({
        text: m.text().replace(/https?:\/\/\S+/g, "[URL]"),
        host: (() => {
          try {
            return new URL(m.location().url).hostname;
          } catch {
            return "";
          }
        })(),
      });
  });
}
try {
  if (mode === "before" && process.env.NAV_PALETTE_REUSE_BEFORE) {
    const prior = JSON.parse(
      await readFile(
        process.env.NAV_PALETTE_REUSE_BEFORE + "/results.json",
        "utf8",
      ),
    );
    rows.push(...prior.rows);
    interactions.push(...prior.interactions);
    for (const f of await readdir(process.env.NAV_PALETTE_REUSE_BEFORE))
      if (f.endsWith(".png") && f !== "failure.png")
        await copyFile(
          process.env.NAV_PALETTE_REUSE_BEFORE + "/" + f,
          output + "/" + f,
        );
  }
  browser = await chromium.launch({
    executablePath:
      process.env.BROWSER_EXECUTABLE || "/opt/google/chrome/chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const theme of ["light", "dark"])
    for (const width of [1440, 390]) {
      if (rows.some((r) => r.theme === theme && r.width === width)) continue;
      const c = await context(theme, width),
        p = await c.newPage();
      active = p;
      listen(p);
      assert.equal(
        (
          await p.goto(url.origin + "/", { waitUntil: "domcontentloaded" })
        ).status(),
        200,
      );
      await ready(p, theme);
      const nav = p.getByRole("navigation", { name: "Primary", exact: true });
      const row = {
        theme,
        width,
        home: {
          nav: await styles(nav),
          body: await styles(p.locator("body")),
          overflow: await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
        },
      };
      assert.equal(row.home.overflow, false, "HOME_HORIZONTAL_OVERFLOW");
      if (width === 1440) {
        await shot(p, `desktop-${theme}-navbar`, {
          x: 0,
          y: 0,
          width,
          height: 160,
        });
        const blog = nav.getByRole("link", { name: "Blog", exact: true });
        await blog.focus();
        await p.keyboard.press("Tab");
        await blog.focus();
        const submenu = nav.locator('ul[id^="desktop-submenu-"]');
        await submenu.waitFor({ state: "visible" });
        row.blogDropdown = await styles(submenu);
        row.blogLink = await styles(blog);
        const sublinks = await submenu.getByRole("link").all();
        row.blogSublinks = [];
        for (const link of sublinks)
          row.blogSublinks.push({
            ...(await styles(link)),
            href: await link.getAttribute("href"),
          });
      if (mode === "after") {
        await sublinks[0].hover();
        row.blogSubHover = await styles(sublinks[0]);
        assert.equal(hex(row.blogSubHover.background), palette[theme].background, "SUBLINK_HOVER_BACKGROUND");
        assert.equal(hex(row.blogSubHover.color), palette[theme].accent, "SUBLINK_HOVER_ACCENT");
        assert.ok(contrast(row.blogSubHover.color, row.blogSubHover.effectiveBackground) >= 4.5, "SUBLINK_HOVER_CONTRAST");
        const selectedLanguage = nav.getByRole("button", { name: "Switch to English", exact: true });
        await selectedLanguage.hover();
        row.selectedLanguageHover = await styles(selectedLanguage);
        assert.equal(hex(row.selectedLanguageHover.background), palette[theme].accent, "SELECTED_LANGUAGE_HOVER_KEEPS_ACCENT");
        assert.ok(contrast(row.selectedLanguageHover.color, row.selectedLanguageHover.effectiveBackground) >= 4.5, "SELECTED_LANGUAGE_HOVER_CONTRAST");
      }
        await shot(p, `desktop-${theme}-blog-dropdown`, {
          x: 0,
          y: 0,
          width,
          height: 310,
        });
        await p.keyboard.press("Escape");
        await submenu.waitFor({ state: "hidden" });
        interactions.push({
          theme,
          width,
          action: "desktop-blog-Escape",
          pass: true,
        });
      } else {
        const trigger = nav.getByRole("button", {
          name: "Open menu",
          exact: true,
        });
        await trigger.click();
        const panel = p.locator("#mobile-navigation-panel");
        await panel.waitFor({ state: "visible" });
        row.mobilePanel = await styles(panel);
        const blog = panel.getByRole("button", { name: /^Blog(?:\s|$)/ });
        await blog.click();
        const id = await blog.getAttribute("aria-controls");
        await p.locator("#" + id).waitFor({ state: "visible" });
        row.mobileSubmenu = await styles(p.locator("#" + id));
        await shot(p, `mobile-${theme}-menu`);
        await p.keyboard.press("Escape");
        await panel.waitFor({ state: "hidden" });
        assert.equal(
          await p
            .getByRole("button", { name: "Open menu", exact: true })
            .evaluate((e) => document.activeElement === e),
          true,
        );
        interactions.push({
          theme,
          width,
          action: "mobile-menu-Escape-restore-focus",
          pass: true,
        });
        await trigger.click();
      }
      const themeTrigger = nav
        .getByRole("button", { name: "Toggle theme", exact: true })
        .filter({ visible: true })
        .first();
      const language = nav
        .getByRole("button", { name: "Switch to English", exact: true })
        .filter({ visible: true })
        .first();
      row.languageActive = await styles(language);
      if (mode === "after") row.languageGeometry = await languageGeometry(language);
      await themeTrigger.click();
      const themeOption = nav.getByRole("button", {
        name: theme === "light" ? "Light" : "Dark",
        exact: true,
      });
      await themeOption.waitFor({ state: "visible" });
      if (mode === "after") {
        await themeOption.click();
        await p.waitForFunction(
          (t) =>
            localStorage.getItem("theme") === t &&
            document.documentElement.classList.contains(t),
          theme,
        );
        await themeTrigger.click();
        await themeOption.waitFor({ state: "visible" });
        assert.equal(
          await themeOption.getAttribute("aria-pressed"),
          "true",
          "SELECTED_THEME_OPTION",
        );
      }
      row.themeActive = await styles(themeOption);
      row.themePanel = await styles(themeOption.locator(".."));
      await shot(
        p,
        `${width === 1440 ? "desktop" : "mobile"}-${theme}-theme-language`,
      );
      if (mode === "after") {
        assert.equal(
          hex(row.home.nav.background),
          palette[theme].background,
          "NAV_PALETTE",
        );
        assert.equal(
          hex(row.themePanel.background),
          palette[theme].surface,
          "THEME_PANEL_PALETTE",
        );
        assert.equal(
          hex(row.languageActive.background),
          palette[theme].accent,
          "LANGUAGE_ACTIVE_ACCENT",
        );
        assert.ok(
          contrast(
            row.languageActive.color,
            row.languageActive.effectiveBackground,
          ) >= 4.5,
          "ACTIVE_LANGUAGE_CONTRAST",
        );
        assert.ok(
          contrast(
            row.themeActive.color,
            row.themeActive.effectiveBackground,
          ) >= 4.5,
          "ACTIVE_THEME_CONTRAST",
        );
        if (row.blogDropdown) {
          assert.equal(
            hex(row.blogDropdown.background),
            palette[theme].surface,
            "BLOG_POPOVER_PALETTE",
          );
          for (const link of row.blogSublinks)
            assert.ok(
              contrast(link.color, link.effectiveBackground) >= 4.5,
              "BLOG_LINK_CONTRAST",
            );
        }
        await p.keyboard.press("Escape");
        await themeOption.waitFor({ state: "hidden" });
        assert.equal(
          await themeTrigger.evaluate((e) => document.activeElement === e),
          true,
          "THEME_ESCAPE_FOCUS",
        );
        row.themeFocus = await styles(themeTrigger);
        assert.ok(row.themeFocus.focusVisible && parseFloat(row.themeFocus.outlineWidth) >= 2, "THEME_FOCUS_VISIBLE");
        assert.ok(contrast(row.themeFocus.outlineColor, row.themeFocus.effectiveBackground) >= 3, "THEME_FOCUS_CONTRAST");
        interactions.push({
          theme,
          width,
          action: "theme-Escape-restore-focus",
          pass: true,
        });
      } else await themeTrigger.click();
      if (width === 390) await p.keyboard.press("Escape");
      assert.equal(
        (
          await p.goto(url.origin + article, { waitUntil: "domcontentloaded" })
        ).status(),
        200,
      );
      await ready(p, theme);
      await p.locator("article.post-article h1").waitFor();
      row.blog = {
        nav: await styles(
          p.getByRole("navigation", { name: "Primary", exact: true }),
        ),
        hasHomeLayout: await p.locator("main.home-v2").count(),
        code: await p
          .locator("pre code")
          .evaluateAll((items) =>
            items
              .slice(0, 2)
              .map((e) => ({
                text: e.textContent,
                color: getComputedStyle(e).color,
                background: getComputedStyle(e).backgroundColor,
                html: e.innerHTML,
              })),
          ),
        tokens: await p.evaluate(() =>
          Object.fromEntries(
            [
              "--hljs-bg",
              "--hljs-fg",
              "--hljs-keyword",
              "--hljs-string",
              "--hljs-comment",
              "--hljs-title",
              "--hljs-number",
              "--hljs-strong",
            ].map((t) => [
              t,
              getComputedStyle(document.documentElement)
                .getPropertyValue(t)
                .trim(),
            ]),
          ),
        ),
        title: await p.locator("article.post-article h1").textContent(),
        canonical: await p
          .locator('link[rel="canonical"]')
          .getAttribute("href"),
      };
      row.blog.code = row.blog.code.map((v) => ({
        color: v.color,
        background: v.background,
        textSha256: sha(v.text),
        htmlSha256: sha(v.html),
      }));
      assert.equal(row.blog.hasHomeLayout, 0, "INTERNAL_LAYOUT_PRESERVED");
      assert.equal(row.blog.canonical, "https://www.jhonattan.dev" + article);
      if (width === 1440) await shot(p, `blog-${theme}-internal`);
      if (mode === "after") {
        assert.equal(
          hex(row.blog.nav.background),
          palette[theme].background,
          "INTERNAL_NAV_PALETTE",
        );
        if (baseline) {
          const previous = baseline.rows.find(
            (r) => r.theme === theme && r.width === width,
          );
          assert.ok(previous);
          assert.deepEqual(
            row.blog.code,
            previous.blog.code,
            "SYNTAX_HIGHLIGHT_UNCHANGED",
          );
          assert.deepEqual(
            row.blog.tokens,
            previous.blog.tokens,
            "SYNTAX_TOKENS_UNCHANGED",
          );
          assert.equal(row.blog.title, previous.blog.title);
          assert.equal(row.blog.canonical, previous.blog.canonical);
        }
      }
      rows.push(row);
      await c.close();
    }
  if (mode === "after") {
    const c = await context("light", 768),
      p = await c.newPage();
    active = p;
    listen(p);
    await p.goto(url.origin + "/", { waitUntil: "domcontentloaded" });
    await ready(p, "light");
    const nav = p.getByRole("navigation", { name: "Primary", exact: true }),
      themeTrigger = nav.getByRole("button", {
        name: "Toggle theme",
        exact: true,
      });
    const tabletLanguageGeometry = await languageGeometry(nav.getByRole("button", { name: "Switch to English", exact: true }));
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      "TABLET_OVERFLOW",
    );
    await nav.getByRole("link", { name: "Home", exact: true }).focus();
    await p.keyboard.press("Tab");
    const focused = await styles(p.locator(":focus"));
    assert.ok(
      focused.focusVisible && parseFloat(focused.outlineWidth) >= 2,
      "REAL_TAB_VISIBLE_FOCUS",
    );
    assert.ok(
      contrast(focused.outlineColor, focused.effectiveBackground) >= 3,
      "FOCUS_CONTRAST",
    );
    await shot(p, "tablet-light-keyboard-focus");
    for (
      let i = 0;
      i < 20 &&
      !(await themeTrigger.evaluate((e) => document.activeElement === e));
      i++
    )
      await p.keyboard.press("Tab");
    assert.equal(
      await themeTrigger.evaluate((e) => document.activeElement === e),
      true,
      "THEME_KEYBOARD_REACHABLE",
    );
    await p.keyboard.press("Enter");
    const choose = async (label) => {
      await nav.getByRole("button", { name: label, exact: true }).click();
      await p.waitForFunction(
        (label) => localStorage.getItem("theme") === label.toLowerCase(),
        label,
      );
    };
    await choose("Dark");
    await p.reload({ waitUntil: "domcontentloaded" });
    await ready(p, "dark");
    assert.equal(await p.evaluate(() => localStorage.getItem("theme")), "dark");
    await themeTrigger.click();
    await choose("Light");
    await p.reload({ waitUntil: "domcontentloaded" });
    await ready(p, "light");
    assert.equal(
      await p.evaluate(() => localStorage.getItem("theme")),
      "light",
    );
    await themeTrigger.click();
    await choose("System");
    await p.reload({ waitUntil: "domcontentloaded" });
    await p.waitForFunction(
      () =>
        localStorage.getItem("theme") === "system" &&
        document.documentElement.classList.contains("light"),
    );
    await p.emulateMedia({ colorScheme: "dark" });
    await p.waitForFunction(() =>
      document.documentElement.classList.contains("dark"),
    );
    await p.emulateMedia({ colorScheme: "light" });
    await p.waitForFunction(() =>
      document.documentElement.classList.contains("light"),
    );
    const language = nav.getByRole("button", {
      name: "Switch to Spanish",
      exact: true,
    });
    await language.click();
    await p.waitForURL(url.origin + "/es-co");
    await p.waitForFunction(() => document.documentElement.lang === "es-CO");
    await nav
      .getByRole("button", { name: "Switch to English", exact: true })
      .click();
    await p.waitForURL(url.origin + "/");
    await p.waitForFunction(() => document.documentElement.lang === "en");
    await p.goto(url.origin + article, { waitUntil: "domcontentloaded" });
    await p.locator("article.post-article h1").waitFor();
    const esHref = await p
      .locator('link[rel="alternate"][hreflang="es-CO"]')
      .getAttribute("href");
    const esPath = new URL(esHref).pathname;
    await nav
      .getByRole("button", { name: "Switch to Spanish", exact: true })
      .click();
    await p.waitForURL(url.origin + esPath);
    await p.locator("article.post-article h1").waitFor();
    await nav
      .getByRole("button", { name: "Switch to English", exact: true })
      .click();
    await p.waitForURL(url.origin + article);
    await p.locator("article.post-article h1").waitFor();
    interactions.push({
      action:
        "tablet-768-Tab-focus-theme-Light-Dark-System-reload-system-media-and-EN-ES-home-article-roundtrip",
      pass: true,
      languageGeometry: tabletLanguageGeometry,
      focusContrast: contrast(
        focused.outlineColor,
        focused.effectiveBackground,
      ),
    });
    await c.close();
    const mobile = await context("dark", 320),
      m = await mobile.newPage();
    active = m;
    listen(m);
    await m.goto(url.origin + "/", { waitUntil: "domcontentloaded" });
    await ready(m, "dark");
    await m.getByRole("button", { name: "Open menu", exact: true }).click();
    const panel = m.locator("#mobile-navigation-panel"),
      blog = panel.getByRole("button", { name: /^Blog(?:\s|$)/ });
    const id = await blog.getAttribute("aria-controls"),
      submenu = m.locator("#" + id);
    assert.equal(
      await submenu.evaluate((e) => e.inert),
      true,
      "COLLAPSED_SUBMENU_INERT",
    );
    await blog.focus();
    await m.keyboard.press("Tab");
    assert.equal(
      await submenu.evaluate((e) => e.contains(document.activeElement)),
      false,
      "COLLAPSED_LINKS_NOT_TABBABLE",
    );
    const trigger = panel.getByRole("button", {
      name: "Toggle theme",
      exact: true,
    });
    await trigger.click();
    await panel.getByRole("button", { name: "Dark", exact: true }).waitFor();
    const box = await panel
      .getByRole("button", { name: "Dark", exact: true })
      .locator("..")
      .boundingBox();
    assert.ok(
      box.x >= 0 && box.x + box.width <= 321,
      "MOBILE_THEME_DROPDOWN_IN_VIEWPORT",
    );
    await m.keyboard.press("Escape");
    assert.equal(
      await panel.isVisible(),
      true,
      "NESTED_ESCAPE_KEEPS_OUTER_MENU",
    );
    assert.equal(
      await trigger.evaluate((e) => document.activeElement === e),
      true,
      "NESTED_ESCAPE_RETURNS_THEME_FOCUS",
    );
    const disabled = panel.getByRole("button", {
      name: "Switch to Spanish",
      exact: true,
    });
    const mobileLanguageGeometry = await languageGeometry(panel.getByRole("button", { name: "Switch to English", exact: true }));
    await disabled.evaluate((e) => {
      e.disabled = true;
    });
    const disabledStyle = await styles(disabled);
    assert.equal(disabledStyle.disabled, true);
    assert.ok(parseFloat(disabledStyle.opacity) < 1, "DISABLED_DISTINCT");
    assert.equal(await disabled.isEnabled(), false);
    await disabled.evaluate((e) => {
      e.disabled = false;
    });
    await shot(m, "mobile-dark-320-menu");
    assert.equal(
      await m.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      "MOBILE_320_OVERFLOW",
    );
    await m.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    interactions.push({
      action:
        "mobile-320-collapsed-submenu-inert-nested-Escape-disabled-visual-state",
      pass: true,
      disabledSimulationOnly: true,
      languageGeometry: mobileLanguageGeometry,
      disabledStyle,
    });
    await mobile.close();
  }
  assert.deepEqual(errors, [], "JAVASCRIPT_ERRORS");
  assert.deepEqual(analytics, [], "ANALYTICS_DISABLED");
  const appConsole = consoleErrors.filter(
    (e) =>
      !["www.google.com", "www.gstatic.com", "csp.withgoogle.com"].includes(
        e.host,
      ),
  );
  assert.deepEqual(appConsole, [], "APPLICATION_CONSOLE_ERRORS");
  status = "PASS";
} catch (e) {
  failure = {
    name: e.name,
    message: String(e.message)
      .replace(/https?:\/\/\S+/g, "[URL]")
      .slice(0, 400),
  };
  await active
    ?.screenshot({ path: output + "/failure.png", animations: "disabled" })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  await save("results.json", {
    status,
    mode,
    origin: url.origin,
    buildId: process.env.NAV_PALETTE_BUILD_ID || null,
    rows,
    interactions,
    errors,
    consoleErrors,
    analytics,
    blocked,
    failure,
    cmsMutations: 0,
    formsSubmitted: 0,
    limits: [
      "Local browser only; no authenticated preview content or remote configuration tested.",
      "Before phase captures baseline without enforcing the new palette.",
    ],
  });
  const files = [];
  for (const name of await readdir(output)) {
    if (name === "evidence-manifest.json") continue;
    const b = await readFile(output + "/" + name);
    files.push({ path: name, bytes: b.length, sha256: sha(b) });
  }
  await save("evidence-manifest.json", { files });
}
console.log(
  JSON.stringify({
    status,
    mode,
    rows: rows.length,
    screenshots: (await readdir(output)).filter((n) => n.endsWith(".png"))
      .length,
    failure,
    output,
  }),
);
