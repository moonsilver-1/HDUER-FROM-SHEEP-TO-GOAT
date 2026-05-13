import { WikiHome } from "@/components/wiki-home";
import { getArticles, getWikiEntries } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [articles, entries] = await Promise.all([getArticles(), getWikiEntries()]);

  return <WikiHome articles={articles} entries={entries} />;
}
