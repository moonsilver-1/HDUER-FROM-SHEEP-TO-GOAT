"use client";

import { useActionState, useTransition } from "react";
import {
  changePasswordAction,
  reviewAccountAction,
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
