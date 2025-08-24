import { useState, useEffect } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

const processMarkdown = async (content: string): Promise<string> => {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(content);

  return result.toString();
};

interface UseMarkdownReturn {
  html: string;
  isLoading: boolean;
  error: string | null;
}

export const useMarkdown = (
  markdown: string | undefined
): UseMarkdownReturn => {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!markdown?.trim()) {
      setHtml("");
      setIsLoading(false);
      setError(null);
      return;
    }

    console.log(html)

    setIsLoading(true);
    setError(null);

    processMarkdown(markdown)
      .then((processedHtml) => {
        setHtml(processedHtml);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to process markdown"
        );
        setHtml("");
        setIsLoading(false);
      });
  }, [markdown]);

  return { html, isLoading, error };
};
