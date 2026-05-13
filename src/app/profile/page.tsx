import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm, ReviewButtons } from "@/components/profile-actions";
import { getCurrentSession, listPendingAccounts } from "@/lib/auth";

export const metadata = {
  title: "个人主页 | HDU Wiki"
};

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const pendingAccounts = session.role === "admin" ? await listPendingAccounts() : [];

  return (
    <main className="profile-page">
      <Link className="back-link" href="/">
        返回首页
      </Link>

      <section className="profile-head">
        <p>{session.role === "admin" ? "管理员" : "游客"}</p>
        <h1>{session.username}</h1>
      </section>

      <section className="profile-section">
        <h2>修改密码</h2>
        <ChangePasswordForm />
      </section>

      {session.role === "admin" && (
        <section className="profile-section">
          <h2>待审核账号</h2>
          {pendingAccounts.length > 0 ? (
            <div className="pending-list">
              {pendingAccounts.map((account) => (
                <div className="pending-row" key={account.username}>
                  <div>
                    <strong>{account.username}</strong>
                    <span>学号：{account.studentId || "未填写"}</span>
                    <span>{account.createdAt}</span>
                  </div>
                  <ReviewButtons username={account.username} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">暂无待审核账号。</p>
          )}
        </section>
      )}
    </main>
  );
}
