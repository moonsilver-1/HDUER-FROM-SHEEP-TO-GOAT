"use client";

import { MarkdownView } from "@/lib/markdown";

type ArticleContentProps = {
  content: string;
  highlight?: string;
};

export function ArticleContent({ content, highlight }: ArticleContentProps) {
  return <MarkdownView content={content} highlight={highlight} />;
}
