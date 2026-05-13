import Link from "next/link";
import { redirect } from "next/navigation";
import { ContributionForm } from "@/components/contribution-form";
import { getCurrentSession } from "@/lib/auth";

export const metadata = {
  title: "投稿 | HDU Wiki"
};

export default async function ContributePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="profile-page">
      <Link className="back-link" href="/">
        返回首页
      </Link>

      <section className="profile-head">
        <p>投稿</p>
        <h1>提交词条或文章</h1>
      </section>

      <section className="profile-section">
        <h2>投稿内容</h2>
        <ContributionForm />
      </section>
    </main>
  );
}
