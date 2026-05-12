"use client";

import { useEffect, useRef } from "react";

type MarkdownViewProps = {
  content: string;
  highlight?: string;
};

function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function inlineMarkdown(text: string, keyword?: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index}>
          {keyword ? highlightText(part.slice(2, -2), keyword) : part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index}>
          {keyword ? highlightText(part.slice(1, -1), keyword) : part.slice(1, -1)}
        </code>
      );
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]}>
          {keyword ? highlightText(link[1], keyword) : link[1]}
        </a>
      );
    }

    return keyword ? highlightText(part, keyword) : part;
  });
}

export function MarkdownView({ content, highlight }: MarkdownViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    elements.push(
      <ul key={`list-${elements.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{inlineMarkdown(item, highlight)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h2 key={index}>{inlineMarkdown(trimmed.slice(4), highlight)}</h2>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={index}>{inlineMarkdown(trimmed.slice(3), highlight)}</h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={index}>{inlineMarkdown(trimmed.slice(2), highlight)}</h1>
      );
      return;
    }

    elements.push(<p key={index}>{inlineMarkdown(trimmed, highlight)}</p>);
  });

  flushList();

  useEffect(() => {
    if (!highlight || !containerRef.current) return;
    const mark = containerRef.current.querySelector(".search-highlight");
    mark?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  return (
    <div className="markdown-view" ref={containerRef}>
      {elements}
    </div>
  );
}
