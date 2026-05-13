"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  loginAction,
  registerAction,
  type AuthActionState
} from "@/app/auth/actions";

const initialState: AuthActionState = { ok: false, message: "" };

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.ok) {
      router.push("/");
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form className="minimal-auth-form" action={formAction}>
      <label>
        账号
        <input autoComplete="username" name="username" required />
      </label>
      <label>
        密码
        <input autoComplete="current-password" name="password" type="password" required />
      </label>
      <button type="submit" disabled={isPending}>
        登录
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
      <p className="auth-switch">
        没有账号？<Link href="/register">点我注册</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  useEffect(() => {
    if (state.ok) {
      const timer = window.setTimeout(() => router.push("/login"), 900);
      return () => window.clearTimeout(timer);
    }
  }, [router, state.ok]);

  return (
    <form className="minimal-auth-form" action={formAction}>
      <label>
        账号
        <input autoComplete="username" name="username" required />
      </label>
      <label>
        密码
        <input autoComplete="new-password" name="password" type="password" required />
      </label>
      <label>
        再次输入密码
        <input autoComplete="new-password" name="confirmPassword" type="password" required />
      </label>
      <label>
        学号
        <input inputMode="numeric" name="studentId" required />
      </label>
      <button type="submit" disabled={isPending}>
        注册
      </button>
      {state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </form>
  );
}
