import { WikiHome } from "@/components/wiki-home";
import { getArticles, getWikiEntries } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [articles, entries] = await Promise.all([getArticles(), getWikiEntries()]);
  const articleCards = articles.map(({ slug, title, excerpt, content }) => ({
    slug,
    title,
    excerpt,
    searchText: `${title}\n${excerpt}\n${content}`.toLowerCase()
  }));

  return <WikiHome articles={articleCards} entries={entries} />;
}
