"use client";

import { useEffect, useState, useTransition } from "react";
import {
  changePasswordAction,
  getAuthSnapshot,
  loginAction,
  logoutAction,
  registerAction,
  reviewAccountAction,
  type AuthActionState,
  type AuthSnapshot
} from "@/app/auth/actions";

const initialState: AuthActionState = { ok: false, message: "" };

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    databaseReady: true,
    session: null,
    pendingAccounts: []
  });
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const next = await getAuthSnapshot();
      setSnapshot(next);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = () => {
    startTransition(async () => {
      const result = await logoutAction();
      setNotice(result.message);
      await getAuthSnapshot().then(setSnapshot);
    });
  };

  const submitAuth = (formData: FormData) => {
    startTransition(async () => {
      const result =
        mode === "login"
          ? await loginAction(initialState, formData)
          : await registerAction(initialState, formData);
      setNotice(result.message);
      await getAuthSnapshot().then(setSnapshot);
    });
  };

  const submitPassword = (formData: FormData) => {
    startTransition(async () => {
      const result = await changePasswordAction(initialState, formData);
      setNotice(result.message);
      await getAuthSnapshot().then(setSnapshot);
    });
  };

  const review = (formData: FormData) => {
    startTransition(async () => {
      const result = await reviewAccountAction(formData);
      setNotice(result.message);
      await getAuthSnapshot().then(setSnapshot);
    });
  };

  if (!snapshot.databaseReady) {
    return (
      <section className="auth-panel" aria-label="账号管理">
        <div className="auth-header">
          <div>
            <p className="eyebrow">ACCOUNT</p>
            <h2>账号入口</h2>
          </div>
        </div>
        <p className="auth-message">
          尚未配置数据库。请在 Vercel 绑定 Neon Postgres，并同步 DATABASE_URL。
        </p>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="账号管理">
      <div className="auth-header">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h2>账号入口</h2>
        </div>
        {snapshot.session && (
          <button className="ghost-button" type="button" onClick={logout} disabled={isPending}>
            退出
          </button>
        )}
      </div>

      {snapshot.session ? (
        <div className="auth-stack">
          <div className="session-card">
            <span>{snapshot.session.role === "admin" ? "管理员" : "游客"}</span>
            <strong>{snapshot.session.username}</strong>
          </div>

          <form className="auth-form" action={submitPassword}>
            <label>
              原密码
              <input name="oldPassword" type="password" required />
            </label>
            <label>
              新密码
              <input name="newPassword" type="password" required />
            </label>
            <button className="primary-button" type="submit">
              修改密码
            </button>
          </form>

          {snapshot.session.role === "admin" && (
            <div className="review-panel">
              <h3>待审核账号</h3>
              {snapshot.pendingAccounts.length > 0 ? (
                <div className="review-list">
                  {snapshot.pendingAccounts.map((account) => (
                    <div className="review-item" key={account.username}>
                      <span>{account.username}</span>
                      <div>
                        <form action={review}>
                          <input name="username" type="hidden" value={account.username} />
                          <input name="status" type="hidden" value="approved" />
                          <button type="submit">通过</button>
                        </form>
                        <form action={review}>
                          <input name="username" type="hidden" value={account.username} />
                          <input name="status" type="hidden" value="rejected" />
                          <button type="submit">拒绝</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">暂无待审核账号。</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <form
          className="auth-form"
          action={submitAuth}
        >
          <div className="auth-tabs" role="tablist" aria-label="账号操作">
            <button
              aria-selected={mode === "login"}
              role="tab"
              type="button"
              onClick={() => setMode("login")}
            >
              登录
            </button>
            <button
              aria-selected={mode === "register"}
              role="tab"
              type="button"
              onClick={() => setMode("register")}
            >
              注册
            </button>
          </div>
          <label>
            账号
            <input autoComplete="username" name="username" required />
          </label>
          <label>
            密码
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              name="password"
              type="password"
              required
            />
          </label>
          <button className="primary-button" type="submit">
            {mode === "login" ? "登录" : "提交注册"}
          </button>
        </form>
      )}

      {notice && <p className="auth-message">{notice}</p>}
    </section>
  );
}
