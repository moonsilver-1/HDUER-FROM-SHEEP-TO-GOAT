import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";

type ArticleAuthGateProps = {
  children: React.ReactNode;
};

export async function ArticleAuthGate({ children }: ArticleAuthGateProps) {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <div className="article-card not-found-card">
        <h1>请先登录</h1>
        <p>游客账号需要管理员审核通过后，才可以阅读文章。</p>
        <Link className="primary-link" href="/">
          返回登录
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
