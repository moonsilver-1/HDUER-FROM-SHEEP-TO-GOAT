import { WikiHome } from "@/components/wiki-home";
import { getArticles, wikiEntries } from "@/lib/content";

export default function Home() {
  return <WikiHome articles={getArticles()} entries={wikiEntries} />;
}
