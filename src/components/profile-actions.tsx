"use client";

import { useActionState, useState, useTransition } from "react";
import {
  changePasswordAction,
  deleteContentAction,
  editContentAction,
  requestUsernameChangeAction,
  reviewAccountAction,
  reviewContributionAction,
  reviewUsernameChangeAction,
  type AuthActionState
} from "@/app/auth/actions";

const initialState: AuthActionState = { ok: false, message: "" };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form className="profile-form" action={formAction}>
      <label>
        原密码
        <input name="oldPassword" type="password" required />
      </label>
      <label>
        新密码
        <input name="newPassword" type="password" required />
      </label>
      <button type="submit" disabled={isPending}>
        修改密码
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </form>
  );
}

export function ChangeUsernameForm() {
  const [state, formAction, isPending] = useActionState(
    requestUsernameChangeAction,
    initialState
  );

  return (
    <form className="profile-form" action={formAction}>
      <label>
        新用户名
        <input autoComplete="username" name="newUsername" required />
      </label>
      <button type="submit" disabled={isPending}>
        提交审核
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </form>
  );
}

export function ReviewButtons({ username }: { username: string }) {
  const [isPending, startTransition] = useTransition();

  const review = (status: "approved" | "rejected") => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("status", status);
      await reviewAccountAction(formData);
      window.location.reload();
    });
  };

  return (
    <div className="review-buttons">
      <button type="button" disabled={isPending} onClick={() => review("approved")}>
        通过
      </button>
      <button type="button" disabled={isPending} onClick={() => review("rejected")}>
        拒绝
      </button>
    </div>
  );
}

export function ReviewUsernameChangeButtons({ requestId }: { requestId: number }) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<AuthActionState>(initialState);

  const review = (status: "approved" | "rejected") => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("requestId", String(requestId));
      formData.set("status", status);
      const result = await reviewUsernameChangeAction(formData);
      setState(result);

      if (result.ok) {
        window.location.reload();
      }
    });
  };

  return (
    <div className="review-buttons">
      <button type="button" disabled={isPending} onClick={() => review("approved")}>
        通过
      </button>
      <button type="button" disabled={isPending} onClick={() => review("rejected")}>
        拒绝
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </div>
  );
}

export function ReviewContributionButtons({ contributionId }: { contributionId: number }) {
  const [isPending, startTransition] = useTransition();

  const review = (status: "approved" | "rejected") => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contributionId", String(contributionId));
      formData.set("status", status);
      await reviewContributionAction(formData);
      window.location.reload();
    });
  };

  return (
    <div className="review-buttons">
      <button type="button" disabled={isPending} onClick={() => review("approved")}>
        通过
      </button>
      <button type="button" disabled={isPending} onClick={() => review("rejected")}>
        拒绝
      </button>
    </div>
  );
}

export function DeleteContentForm({
  type,
  contentKey
}: {
  type: "article" | "entry";
  contentKey: string;
}) {
  const [state, formAction, isPending] = useActionState(deleteContentAction, initialState);

  return (
    <form className="delete-content-form" action={formAction}>
      <input name="type" type="hidden" value={type} />
      <input name="contentKey" type="hidden" value={contentKey} />
      <input
        aria-label="管理员密码"
        name="password"
        placeholder="管理员密码"
        type="password"
        required
      />
      <label>
        <input name="confirmDelete" type="checkbox" value="yes" required />
        确认删除
      </label>
      <button type="submit" disabled={isPending}>
        删除
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </form>
  );
}

export function EditContentForm({
  type,
  contentKey,
  title,
  content
}: {
  type: "article" | "entry";
  contentKey: string;
  title: string;
  content: string;
}) {
  const [state, formAction, isPending] = useActionState(editContentAction, initialState);

  return (
    <details className="edit-content-panel">
      <summary>编辑</summary>
      <form className="profile-form" action={formAction}>
        <input name="type" type="hidden" value={type} />
        <input name="contentKey" type="hidden" value={contentKey} />
        <label>
          标题
          <input
            name="title"
            required
            readOnly={type === "entry"}
            maxLength={80}
            defaultValue={title}
          />
        </label>
        <label>
          内容
          <textarea name="content" required maxLength={20000} rows={8} defaultValue={content} />
        </label>
        <button type="submit" disabled={isPending}>
          保存
        </button>
        {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
      </form>
    </details>
  );
}
