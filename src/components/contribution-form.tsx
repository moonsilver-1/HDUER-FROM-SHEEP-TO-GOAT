"use client";

import { useActionState } from "react";
import { submitContributionAction, type AuthActionState } from "@/app/auth/actions";

const initialState: AuthActionState = { ok: false, message: "" };

export function ContributionForm() {
  const [state, formAction, isPending] = useActionState(
    submitContributionAction,
    initialState
  );

  return (
    <form className="profile-form contribution-form" action={formAction}>
      <label>
        投稿类型
        <select name="type" required defaultValue="article">
          <option value="article">文章</option>
          <option value="entry">词条</option>
        </select>
      </label>
      <label>
        标题 / 词条名
        <input name="title" required maxLength={80} />
      </label>
      <label>
        署名
        <input name="signature" required maxLength={40} />
      </label>
      <label>
        内容
        <textarea name="content" required minLength={20} maxLength={20000} rows={14} />
      </label>
      <button type="submit" disabled={isPending}>
        提交投稿
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </form>
  );
}
