import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

import type { Story } from "./types";

export async function markdownToHtml(markdown: string | undefined): Promise<string> {
  if (!markdown?.trim()) return "";

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(markdown);

  return result.toString();
}

export type StoryWithRenderedIntro = Story & { introHtml: string };

export async function renderStoryIntros(stories: Story[]): Promise<StoryWithRenderedIntro[]> {
  return Promise.all(stories.map(async (story) => ({
    ...story,
    introHtml: await markdownToHtml(story.content.intro),
  })));
}

