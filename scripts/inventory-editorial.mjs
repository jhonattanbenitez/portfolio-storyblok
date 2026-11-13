import nextEnv from "@next/env";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

nextEnv.loadEnvConfig(process.cwd());
const token = process.env.STORYBLOK_TOKEN || process.env.NEXT_PUBLIC_STORYBLOK_TOKEN;
if (!token) {
  console.error("Inventory unavailable: published delivery credentials are missing.");
  process.exit(1);
}

// Inspect published Markdown only. Never print content, story names, paths,
// identifiers, tokens, or provider error objects; report aggregate HTML tags.
const tags = new Map();
let stories = 0;
let fieldsWithHtml = 0;
function inspect(node) {
  if (node.type === "html") {
    for (const [, tag] of node.value.matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)) {
      tags.set(tag.toLowerCase(), (tags.get(tag.toLowerCase()) || 0) + 1);
    }
    return true;
  }
  let found = false;
  for (const child of node.children || []) found = inspect(child) || found;
  return found;
}

try {
  for (let page = 1; ; page++) {
    const url = new URL("https://api-us.storyblok.com/v2/cdn/stories");
    url.search = new URLSearchParams({ token, version: "published", per_page: "100", page: String(page), fallback_lang: "false" }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("Upstream unavailable");
    const data = await response.json();
    for (const story of data.stories) {
      stories++;
      for (const field of ["intro", "content"]) {
        const value = story.content?.[field];
        if (typeof value === "string" && inspect(unified().use(remarkParse).use(remarkGfm).parse(value))) fieldsWithHtml++;
      }
    }
    if (data.stories.length < 100) break;
  }
  console.log(JSON.stringify({ version: "published", stories, fieldsWithHtml, tags: Object.fromEntries([...tags].sort()) }, null, 2));
} catch {
  console.error("Inventory unavailable: network or upstream response failed; no content was logged.");
  process.exitCode = 1;
}
