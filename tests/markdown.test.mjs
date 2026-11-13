import assert from "node:assert/strict";
import test from "node:test";

import { markdownToHtml } from "../utils/markdown.ts";

test("renders headings, paragraphs, and inline Markdown", async () => {
  const html = await markdownToHtml("# Heading\n\nA **bold** and *emphasized* [link](https://example.com).");
  assert.equal(
    html,
    '<h1>Heading</h1>\n<p>A <strong>bold</strong> and <em>emphasized</em> <a href="https://example.com">link</a>.</p>',
  );
});

test("renders GFM lists and tables", async () => {
  const html = await markdownToHtml("- one\n- two\n\n| Name | Value |\n| --- | --- |\n| A | 1 |");
  assert.match(html, /<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>Name<\/th>/);
  assert.match(html, /<td>1<\/td>/);
});

test("renders fenced code with syntax highlighting", async () => {
  const html = await markdownToHtml("```js\nconst answer = 42;\n```");
  assert.match(html, /<code class="hljs language-js">/);
  assert.match(html, /<span class="hljs-keyword">const<\/span>/);
  assert.match(html, /<span class="hljs-number">42<\/span>/);
});

test("empty Markdown renders an empty string", async () => {
  assert.equal(await markdownToHtml(""), "");
  assert.equal(await markdownToHtml("   \n"), "");
  assert.equal(await markdownToHtml(undefined), "");
});

test("preserves embedded raw HTML as the previous trusted-CMS pipeline did", async () => {
  const html = await markdownToHtml('<aside class="note"><strong>Editorial HTML</strong></aside>');
  assert.equal(html, '<aside class="note"><strong>Editorial HTML</strong></aside>');
});

test("preserves safe editorial details, relative links, email links, and GFM tasks", async () => {
  const html = await markdownToHtml('<details><summary>More</summary><p>Safe text</p></details>\n\n[Local](/posts/example) [Email](mailto:hello@example.com)\n\n- [x] Done');
  assert.match(html, /<details><summary>More<\/summary><p>Safe text<\/p><\/details>/);
  assert.match(html, /href="\/posts\/example"/);
  assert.match(html, /href="mailto:hello@example.com"/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /disabled/);
});

test("strips executable HTML, unsafe protocols, styles, and DOM clobbering", async () => {
  const html = await markdownToHtml('<script>syntheticProbe()</script><iframe src="https://example.com"></iframe><svg onload="syntheticProbe()"></svg><img src="x" onerror="syntheticProbe()" style="color:red"><a href="jav&#x61;script:syntheticProbe()">Bad</a><a href="data:text/html,probe">Bad</a><p id="location" name="cookie" onclick="syntheticProbe()">Text</p>');
  assert.doesNotMatch(html, /<script|<iframe|<svg|onerror|onload|onclick|style=|javascript:|data:text\/html|id="location"|name="cookie"/i);
  assert.match(html, /<img src="x">/);
  assert.match(html, /<a>Bad<\/a>/);
  assert.match(html, /id="user-content-location"/);
});

test("sanitization leaves malicious examples in code as inert highlighted text", async () => {
  const html = await markdownToHtml('```html\n<img src=x onerror=alert(1)>\n<script>alert(1)</script>\n```');
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /class="hljs language-html"/);
  assert.match(html, /&#x3C;|&lt;/);
});

test("content stripped to empty never bypasses sanitization", async () => {
  assert.equal(await markdownToHtml('<script>syntheticProbe()</script>'), '');
});

test("GFM footnotes retain their published hashes and sanitized fragment links resolve", async () => {
  const html = await markdownToHtml('Text[^1].\n\n[^1]: Safe note.\n\n<h2 id="location">Safe anchor</h2>\n\n[Jump](#location)');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const targets = [...html.matchAll(/\bhref="#([^"]+)"/g)].map((match) => decodeURIComponent(match[1]));
  assert.ok(ids.has("user-content-fn-1"));
  assert.ok(ids.has("user-content-fnref-1"));
  assert.ok(ids.has("user-content-location"));
  assert.equal(ids.has("location"), false);
  for (const target of targets) assert.ok(ids.has(target), `Broken fragment target: ${target}`);
});
