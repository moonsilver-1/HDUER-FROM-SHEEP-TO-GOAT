import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/content";
import { ArticleContent } from "@/components/article-content";
import { ArticleAuthGate } from "@/components/article-auth-gate";

export function generateStaticParams() {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);

  return {
    title: article ? `${article.title} | HDU Wiki` : "文章 | HDU Wiki",
    description: article?.excerpt
  };
}

export default async function ArticlePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="article-shell">
      <Link className="back-link" href="/">
        返回杭电百科
      </Link>
      <ArticleAuthGate>
        <article className="article-card">
          <ArticleContent content={article.content} highlight={q} />
        </article>
      </ArticleAuthGate>
    </main>
  );
}
