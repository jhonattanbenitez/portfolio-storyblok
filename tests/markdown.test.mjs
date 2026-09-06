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
