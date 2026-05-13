import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChangePasswordForm,
  ChangeUsernameForm,
  ReviewButtons,
  ReviewContributionButtons,
  ReviewUsernameChangeButtons
} from "@/components/profile-actions";
import {
  getCurrentSession,
  listPendingAccounts,
  listPendingContributions,
  listPendingUsernameChanges
} from "@/lib/auth";

export const metadata = {
  title: "个人主页 | HDU Wiki"
};

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const pendingAccounts = session.role === "admin" ? await listPendingAccounts() : [];
  const pendingUsernameChanges =
    session.role === "admin" ? await listPendingUsernameChanges() : [];
  const pendingContributions =
    session.role === "admin" ? await listPendingContributions() : [];

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
        <h2>修改用户名</h2>
        <ChangeUsernameForm />
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

      {session.role === "admin" && (
        <section className="profile-section">
          <h2>待审核用户名修改</h2>
          {pendingUsernameChanges.length > 0 ? (
            <div className="pending-list">
              {pendingUsernameChanges.map((request) => (
                <div className="pending-row" key={request.id}>
                  <div>
                    <strong>
                      {request.currentUsername} → {request.requestedUsername}
                    </strong>
                    <span>{request.createdAt}</span>
                  </div>
                  <ReviewUsernameChangeButtons requestId={request.id} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">暂无待审核用户名修改。</p>
          )}
        </section>
      )}

      {session.role === "admin" && (
        <section className="profile-section">
          <h2>待审核投稿</h2>
          {pendingContributions.length > 0 ? (
            <div className="pending-list">
              {pendingContributions.map((contribution) => (
                <div className="pending-row pending-row-tall" key={contribution.id}>
                  <div>
                    <strong>
                      {contribution.type === "article" ? "文章" : "词条"}：{contribution.title}
                    </strong>
                    <span>
                      {contribution.signature} / {contribution.authorUsername}
                    </span>
                    <span>{contribution.createdAt}</span>
                    <p>{contribution.content}</p>
                  </div>
                  <ReviewContributionButtons contributionId={contribution.id} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">暂无待审核投稿。</p>
          )}
        </section>
      )}
    </main>
  );
}
