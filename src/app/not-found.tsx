import Link from "next/link";

export default function NotFound() {
  return (
    <main className="article-shell">
      <section className="article-card not-found-card">
        <p className="eyebrow">404</p>
        <h1>这页暂时还没被学长学姐写出来</h1>
        <p>可以先回首页搜搜别的词条，或者把这个坑记进贡献清单。</p>
        <Link className="primary-link" href="/">
          回到首页
        </Link>
      </section>
    </main>
  );
}
