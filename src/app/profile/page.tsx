import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChangePasswordForm,
  ChangeUsernameForm,
  DeleteContentForm,
  EditContentForm,
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
import { getArticles, getWikiEntries } from "@/lib/content";

export const metadata = {
  title: "个人主页 | HDU Wiki"
};

function editableArticleContent(content: string) {
  return content.replace(/^# .*(\r?\n){1,2}/, "").trim();
}

function editableEntryContent(summary: string, details: string[]) {
  return [summary, ...details].filter(Boolean).join("\n\n");
}

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const [
    pendingAccounts,
    pendingUsernameChanges,
    pendingContributions,
    articles,
    entries
  ] =
    session.role === "admin"
      ? await Promise.all([
          listPendingAccounts(),
          listPendingUsernameChanges(),
          listPendingContributions(),
          getArticles(),
          getWikiEntries()
        ])
      : [[], [], [], [], []];

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

      {session.role === "admin" && (
        <section className="profile-section">
          <h2>内容管理</h2>
          <div className="content-management">
            <h3>文章</h3>
            <div className="pending-list">
              {articles.map((article) => (
                <div className="pending-row pending-row-tall" key={article.slug}>
                  <div>
                    <strong>{article.title}</strong>
                    <span>{article.slug}</span>
                  </div>
                  <div className="content-management-actions">
                    <EditContentForm
                      type="article"
                      contentKey={article.slug}
                      title={article.title}
                      content={editableArticleContent(article.content)}
                    />
                    <DeleteContentForm type="article" contentKey={article.slug} />
                  </div>
                </div>
              ))}
            </div>

            <h3>词条</h3>
            <div className="pending-list">
              {entries.map((entry) => (
                <div className="pending-row pending-row-tall" key={entry.term}>
                  <div>
                    <strong>{entry.term}</strong>
                    <span>{entry.summary}</span>
                  </div>
                  <div className="content-management-actions">
                    <EditContentForm
                      type="entry"
                      contentKey={entry.term}
                      title={entry.term}
                      content={editableEntryContent(entry.summary, entry.details)}
                    />
                    <DeleteContentForm type="entry" contentKey={entry.term} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
