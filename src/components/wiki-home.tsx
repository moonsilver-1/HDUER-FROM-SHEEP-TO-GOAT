"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { Article, WikiEntry } from "@/lib/content";

type WikiHomeProps = {
  articles: Article[];
  entries: WikiEntry[];
};

const contributors = ["moonsilver", "如山", "09", "langji", "hina_daisuki", "Miss", "blair", "东风揽月", "Zkaqtch"];

export function WikiHome({ articles, entries }: WikiHomeProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) return articles;
    return articles.filter((article) => {
      const haystack = `${article.title}\n${article.content}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [articles, normalizedQuery]);

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return entries.slice(0, 6);
    return entries
      .filter((entry) =>
        [entry.term, ...entry.aliases].some((item) =>
          item.toLowerCase().includes(normalizedQuery)
        )
      )
      .slice(0, 6);
  }, [entries, normalizedQuery]);

  return (
    <main className="home-shell">
      <section className="hero">
        <p className="eyebrow">HDUER FROM SHEEP TO GOAT</p>
        <h1>杭电百科</h1>
        <div className="search-panel">
          <input
            placeholder="搜索文章..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="suggestions">
            {suggestions.map((entry) => (
              <button
                key={entry.term}
                type="button"
                onClick={() => setQuery(entry.term)}
              >
                {entry.term}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="articles-grid">
        {filteredArticles.map((article, i) => (
          <Link
            className="article-card-item"
            href={`/articles/${article.slug}${normalizedQuery ? `?q=${encodeURIComponent(query.trim())}` : ""}`}
            key={article.slug}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <h3>
              {article.slug === "main-guide" && (
                <span className="pin-badge">置顶</span>
              )}
              {article.title}
            </h3>
            <p>{article.excerpt}</p>
            <span className="read-link">阅读全文 →</span>
          </Link>
        ))}
        {filteredArticles.length === 0 && (
          <div className="empty-state">
            <p>没有找到匹配的文章</p>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span className="footer-label">贡献者</span>
        <div className="footer-contributors">
          {contributors.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </footer>
    </main>
  );
}
