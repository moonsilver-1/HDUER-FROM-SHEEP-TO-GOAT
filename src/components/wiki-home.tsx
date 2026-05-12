"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { Article, WikiEntry } from "@/lib/content";

type WikiHomeProps = {
  articles: Article[];
  entries: WikiEntry[];
};

const contributors = ["moonsilver", "如山", "09", "zmy"];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function WikiHome({ articles, entries }: WikiHomeProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalize(deferredQuery);

  const matchedEntry = useMemo(() => {
    if (!normalizedQuery) {
      return entries[0];
    }

    return (
      entries.find((entry) =>
        [entry.term, ...entry.aliases].some((item) =>
          normalize(item).includes(normalizedQuery)
        )
      ) ?? null
    );
  }, [entries, normalizedQuery]);

  const suggestions = useMemo(() => {
    const source = normalizedQuery
      ? entries.filter((entry) =>
          [entry.term, ...entry.aliases].some((item) =>
            normalize(item).includes(normalizedQuery)
          )
        )
      : entries;

    return source.slice(0, 6);
  }, [entries, normalizedQuery]);

  const relatedArticles = useMemo(() => {
    const keywords = matchedEntry
      ? [matchedEntry.term, ...matchedEntry.aliases]
      : normalizedQuery
        ? [normalizedQuery]
        : [];

    if (keywords.length === 0) {
      return articles.slice(0, 4);
    }

    return articles
      .filter((article) => {
        const haystack = `${article.title}\n${article.content}`.toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
      })
      .slice(0, 4);
  }, [articles, matchedEntry, normalizedQuery]);

  return (
    <main className="home-shell">
      <section className="hero">
        <div className="hero-rule" />
        <p className="eyebrow">HDUER FROM SHEEP TO GOAT</p>
        <h1>杭电百科</h1>
        <p className="hero-subtitle">
          把绩点、竞赛、科研、工具链这些新生黑话，翻译成能马上行动的校园说明书。
        </p>
        <div className="search-panel">
          <label htmlFor="wiki-search">搜索词条</label>
          <input
            id="wiki-search"
            placeholder="试试：绩点、竞赛、AI、GitHub"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="suggestions" aria-label="猜你想搜">
            <span>猜你想搜</span>
            {suggestions.map((entry) => (
              <button key={entry.term} type="button" onClick={() => setQuery(entry.term)}>
                {entry.term}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="entry-card">
          <p className="section-kicker">词条解释</p>
          {matchedEntry ? (
            <>
              <h2>{matchedEntry.term}</h2>
              <p className="entry-summary">{matchedEntry.summary}</p>
              <div className="alias-row">
                {matchedEntry.aliases.map((alias) => (
                  <span key={alias}>{alias}</span>
                ))}
              </div>
              <ul>
                {matchedEntry.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2>还没收录这个词</h2>
              <p className="entry-summary">
                可以先看看下方相关文章。之后我们可以把这个搜索词变成新词条。
              </p>
            </>
          )}
        </div>

        <aside className="article-stack">
          <p className="section-kicker">相关文章</p>
          {relatedArticles.length > 0 ? (
            relatedArticles.map((article) => (
              <Link className="article-preview" href={`/articles/${article.slug}`} key={article.slug}>
                <span>阅读文章</span>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
              </Link>
            ))
          ) : (
            <div className="article-preview muted">
              <span>等待补档</span>
              <h3>暂时没有匹配文章</h3>
              <p>这个词条很值得写，已经在空气中发光了。</p>
            </div>
          )}
        </aside>
      </section>

      <section className="contributors-card">
        <div>
          <p className="section-kicker">贡献者们</p>
          <h2>来自学长学姐的杭电生存笔记</h2>
        </div>
        <div className="contributors">
          {contributors.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
