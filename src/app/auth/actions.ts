"use server";

import { revalidatePath } from "next/cache";
import {
  createPasswordRecord,
  databaseAvailable,
  ensureAuthSchema,
  getAuthSql,
  getCurrentSession,
  listPendingAccounts,
  passwordMatches,
  setCurrentSession,
  type PendingAccount,
  type Session
} from "@/lib/auth";

export type AuthActionState = {
  ok: boolean;
  message: string;
};

export type AuthSnapshot = {
  databaseReady: boolean;
  session: Session | null;
  pendingAccounts: PendingAccount[];
};

function cleanUsername(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function cleanPassword(value: FormDataEntryValue | null) {
  return String(value || "");
}

function validateUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  if (!databaseAvailable()) {
    return { databaseReady: false, session: null, pendingAccounts: [] };
  }

  const session = await getCurrentSession();
  const pendingAccounts = session?.role === "admin" ? await listPendingAccounts() : [];

  return { databaseReady: true, session, pendingAccounts };
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const username = cleanUsername(formData.get("username"));
  const password = cleanPassword(formData.get("password"));

  if (!validateUsername(username)) {
    return { ok: false, message: "账号需为 3-20 位字母、数字或下划线。" };
  }

  if (password.length < 6) {
    return { ok: false, message: "密码至少需要 6 位。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const { salt, hash } = createPasswordRecord(password);

  try {
    await sql`
      INSERT INTO accounts (username, password_hash, salt, role, status)
      VALUES (${username}, ${hash}, ${salt}, 'visitor', 'pending')
    `;
  } catch {
    return { ok: false, message: "该账号已存在。" };
  }

  revalidatePath("/");
  return { ok: true, message: "注册成功，等待管理员审核后即可登录。" };
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const username = cleanUsername(formData.get("username"));
  const password = cleanPassword(formData.get("password"));

  await ensureAuthSchema();
  const sql = getAuthSql();
  const rows = (await sql`
    SELECT username, password_hash, salt, role, status
    FROM accounts
    WHERE username = ${username}
    LIMIT 1
  `) as {
    username: string;
    password_hash: string;
    salt: string;
    role: "admin" | "visitor";
    status: "approved" | "pending" | "rejected";
  }[];
  const account = rows[0];

  if (!account || !passwordMatches(password, account.salt, account.password_hash)) {
    return { ok: false, message: "账号或密码错误。" };
  }

  if (account.status !== "approved") {
    return {
      ok: false,
      message:
        account.status === "pending"
          ? "账号正在等待管理员审核。"
          : "账号审核未通过，请重新注册或联系管理员。"
    };
  }

  await setCurrentSession({ username: account.username, role: account.role });
  revalidatePath("/");
  return { ok: true, message: "登录成功。" };
}

export async function logoutAction(): Promise<AuthActionState> {
  await setCurrentSession(null);
  revalidatePath("/");
  return { ok: true, message: "已退出登录。" };
}

export async function changePasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const oldPassword = cleanPassword(formData.get("oldPassword"));
  const newPassword = cleanPassword(formData.get("newPassword"));

  if (!session) {
    return { ok: false, message: "请先登录。" };
  }

  if (newPassword.length < 6) {
    return { ok: false, message: "新密码至少需要 6 位。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const rows = (await sql`
    SELECT password_hash, salt
    FROM accounts
    WHERE username = ${session.username}
    LIMIT 1
  `) as { password_hash: string; salt: string }[];
  const account = rows[0];

  if (!account || !passwordMatches(oldPassword, account.salt, account.password_hash)) {
    return { ok: false, message: "原密码不正确。" };
  }

  const { salt, hash } = createPasswordRecord(newPassword);
  await sql`
    UPDATE accounts
    SET password_hash = ${hash}, salt = ${salt}, updated_at = NOW()
    WHERE username = ${session.username}
  `;

  return { ok: true, message: "密码已修改。" };
}

export async function reviewAccountAction(formData: FormData): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const username = cleanUsername(formData.get("username"));
  const status = String(formData.get("status"));

  if (session?.role !== "admin") {
    return { ok: false, message: "只有管理员可以审核账号。" };
  }

  if (status !== "approved" && status !== "rejected") {
    return { ok: false, message: "审核状态无效。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  await sql`
    UPDATE accounts
    SET status = ${status}, updated_at = NOW()
    WHERE username = ${username} AND role = 'visitor'
  `;

  revalidatePath("/");
  return { ok: true, message: `${username} 已${status === "approved" ? "通过" : "拒绝"}审核。` };
}
