import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/content";
import { MarkdownView } from "@/lib/markdown";

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
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="article-shell">
      <Link className="back-link" href="/">
        返回杭电百科
      </Link>
      <article className="article-card">
        <MarkdownView content={article.content} />
      </article>
    </main>
  );
}
