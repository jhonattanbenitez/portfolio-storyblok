import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeOptions } from "rehype-sanitize";
import type { Element, Root, RootContent } from "hast";
import rehypeStringify from "rehype-stringify";

import type { Story } from "./types";

// Preserve the existing safe editorial aside and highlighter output without
// permitting arbitrary classes, event handlers, styles, embeds, or URL schemes.
const editorialSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "aside"],
  attributes: {
    ...defaultSchema.attributes,
    aside: [["className", "note"]],
    code: [["className", "hljs", /^language-[\w-]+$/]],
    span: [["className", /^hljs-[\w-]+$/, "language_", "class_", "function_"]],
  },
};

/** Keep GFM footnote hashes stable while retaining sanitizer clobber protection. */
function preserveFragmentLinks() {
  return (tree: Root) => {
    const elements: Element[] = [];
    const visit = (node: Root | RootContent) => {
      if (node.type === "element") elements.push(node);
      if ("children" in node) node.children.forEach(visit);
    };
    visit(tree);
    const prefix = defaultSchema.clobberPrefix || "user-content-";
    const normalize = (value: string) => value.startsWith(prefix + prefix) ? value.slice(prefix.length) : value;
    for (const element of elements) {
      for (const key of defaultSchema.clobber || []) {
        const value = element.properties[key];
        element.properties[key] = typeof value === "string" ? normalize(value)
          : Array.isArray(value) ? value.map((part) => typeof part === "string" ? normalize(part) : part)
          : value;
      }
    }
    const ids = new Set(elements.map((element) => element.properties.id).filter((id): id is string => typeof id === "string"));
    for (const element of elements) {
      const href = element.properties.href;
      if (element.tagName !== "a" || typeof href !== "string" || !href.startsWith("#")) continue;
      let target: string;
      try { target = decodeURIComponent(href.slice(1)); } catch { continue; }
      if (!ids.has(target) && ids.has(prefix + target)) {
        element.properties.href = `#${encodeURIComponent(prefix + target)}`;
      }
    }
  };
}

export async function markdownToHtml(markdown: string | undefined): Promise<string> {
  if (!markdown?.trim()) return "";

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeSanitize, editorialSchema)
    .use(preserveFragmentLinks)
    .use(rehypeStringify)
    .process(markdown);

  return result.toString();
}

/** Extract readable text from the same sanitized Markdown dialect used by articles. */
export function markdownToPlainText(markdown: string | undefined): string {
  if (!markdown?.trim()) return "";
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, editorialSchema);
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  const blocks = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "pre", "blockquote", "tr", "td", "th", "br"]);
  const text = (node: Root | RootContent): string => {
    if (node.type === "text") return node.value;
    if (!("children" in node)) return "";
    return node.children.map(text).join("") + (node.type === "element" && blocks.has(node.tagName) ? " " : "");
  };
  return text(tree).replace(/\s+/g, " ").trim();
}

export type StoryWithRenderedIntro = Story & { introHtml: string };

export async function renderStoryIntros(stories: Story[]): Promise<StoryWithRenderedIntro[]> {
  return Promise.all(stories.map(async (story) => ({
    ...story,
    introHtml: await markdownToHtml(story.content.intro),
  })));
}

