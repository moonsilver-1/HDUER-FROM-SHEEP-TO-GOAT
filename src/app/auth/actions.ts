"use server";

import { revalidatePath } from "next/cache";
import {
  type ContentType,
  type ContributionType,
  createPasswordRecord,
  databaseAvailable,
  ensureAuthSchema,
  getAuthSql,
  getCurrentSession,
  listPendingAccounts,
  listPendingContributions,
  listPendingUsernameChanges,
  passwordMatches,
  setCurrentSession,
  type PendingContribution,
  type PendingAccount,
  type PendingUsernameChange,
  type Session
} from "@/lib/auth";
import { getArticles } from "@/lib/content";

export type AuthActionState = {
  ok: boolean;
  message: string;
};

export type AuthSnapshot = {
  databaseReady: boolean;
  session: Session | null;
  pendingAccounts: PendingAccount[];
  pendingUsernameChanges: PendingUsernameChange[];
  pendingContributions: PendingContribution[];
};

const initialMessage = { ok: false, message: "" };

function cleanUsername(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function cleanPassword(value: FormDataEntryValue | null) {
  return String(value || "");
}

function cleanStudentId(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function validateUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || "contribution";
}

async function uniqueArticleSlug(title: string, id: number) {
  const base = slugify(title);
  const existingSlugs = new Set((await getArticles()).map((article) => article.slug));

  return existingSlugs.has(base) ? `${base}-${id}` : base;
}

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  if (!databaseAvailable()) {
    return {
      databaseReady: false,
      session: null,
      pendingAccounts: [],
      pendingUsernameChanges: [],
      pendingContributions: []
    };
  }

  const session = await getCurrentSession();
  const pendingAccounts = session?.role === "admin" ? await listPendingAccounts() : [];
  const pendingUsernameChanges =
    session?.role === "admin" ? await listPendingUsernameChanges() : [];
  const pendingContributions =
    session?.role === "admin" ? await listPendingContributions() : [];

  return {
    databaseReady: true,
    session,
    pendingAccounts,
    pendingUsernameChanges,
    pendingContributions
  };
}

export async function registerAction(
  _previousState: AuthActionState = initialMessage,
  formData: FormData
): Promise<AuthActionState> {
  const username = cleanUsername(formData.get("username"));
  const password = cleanPassword(formData.get("password"));
  const confirmPassword = cleanPassword(formData.get("confirmPassword"));
  const studentId = cleanStudentId(formData.get("studentId"));

  if (!validateUsername(username)) {
    return { ok: false, message: "账号需为 3-20 位字母、数字或下划线。" };
  }

  if (password.length < 6) {
    return { ok: false, message: "密码至少需要 6 位。" };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: "两次输入的密码不一致。" };
  }

  if (!/^\d{6,20}$/.test(studentId)) {
    return { ok: false, message: "学号需为 6-20 位数字。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const { salt, hash } = createPasswordRecord(password);

  try {
    await sql`
      INSERT INTO accounts (username, student_id, password_hash, salt, role, status)
      VALUES (${username}, ${studentId}, ${hash}, ${salt}, 'visitor', 'pending')
    `;
  } catch {
    return { ok: false, message: "该账号已存在。" };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true, message: "注册成功，等待管理员审核后即可登录。" };
}

export async function loginAction(
  _previousState: AuthActionState = initialMessage,
  formData: FormData
): Promise<AuthActionState> {
  const username = cleanUsername(formData.get("username"));
  const password = cleanPassword(formData.get("password"));

  await ensureAuthSchema();
  const sql = getAuthSql();
  const rows = (await sql`
    SELECT id, username, password_hash, salt, role, status
    FROM accounts
    WHERE username = ${username}
    LIMIT 1
  `) as {
    id: number;
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

  await setCurrentSession({
    accountId: account.id,
    username: account.username,
    role: account.role
  });
  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true, message: "登录成功。" };
}

export async function logoutAction(): Promise<AuthActionState> {
  await setCurrentSession(null);
  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true, message: "已退出登录。" };
}

export async function logoutFormAction(): Promise<void> {
  await logoutAction();
}

export async function changePasswordAction(
  _previousState: AuthActionState = initialMessage,
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

export async function submitContributionAction(
  _previousState: AuthActionState = initialMessage,
  formData: FormData
): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const type = String(formData.get("type")) as ContributionType;
  const title = cleanText(formData.get("title"));
  const signature = cleanText(formData.get("signature"));
  const content = cleanText(formData.get("content"));

  if (!session) {
    return { ok: false, message: "请先登录后再投稿。" };
  }

  if (type !== "article" && type !== "entry") {
    return { ok: false, message: "投稿类型无效。" };
  }

  if (title.length < 2 || title.length > 80) {
    return { ok: false, message: "标题需为 2-80 个字符。" };
  }

  if (signature.length < 1 || signature.length > 40) {
    return { ok: false, message: "署名需为 1-40 个字符。" };
  }

  if (content.length < 20 || content.length > 20000) {
    return { ok: false, message: "内容需为 20-20000 个字符。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const accountRows = session.accountId
    ? ((await sql`
        SELECT id
        FROM accounts
        WHERE id = ${session.accountId}
        LIMIT 1
      `) as { id: number }[])
    : ((await sql`
        SELECT id
        FROM accounts
        WHERE username = ${session.username}
        LIMIT 1
      `) as { id: number }[]);
  const account = accountRows[0];

  if (!account) {
    return { ok: false, message: "账号不存在，请重新登录。" };
  }

  const status = session.role === "admin" ? "approved" : "pending";
  const insertedRows = (await sql`
    INSERT INTO contributions (account_id, type, title, signature, content, status, reviewed_at)
    VALUES (
      ${account.id},
      ${type},
      ${title},
      ${signature},
      ${content},
      ${status},
      ${status === "approved" ? sql`NOW()` : null}
    )
    RETURNING id
  `) as { id: number }[];
  const contributionId = insertedRows[0]?.id;

  if (status === "approved" && type === "article" && contributionId) {
    const slug = await uniqueArticleSlug(title, contributionId);
    await sql`
      UPDATE contributions
      SET slug = ${slug}
      WHERE id = ${contributionId}
    `;
  }

  if (!session.accountId) {
    await setCurrentSession({ ...session, accountId: account.id });
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/contribute");
  return {
    ok: true,
    message: session.role === "admin" ? "投稿已发布。" : "投稿已提交，等待管理员审核。"
  };
}

export async function requestUsernameChangeAction(
  _previousState: AuthActionState = initialMessage,
  formData: FormData
): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const requestedUsername = cleanUsername(formData.get("newUsername"));

  if (!session) {
    return { ok: false, message: "请先登录。" };
  }

  if (!validateUsername(requestedUsername)) {
    return { ok: false, message: "新用户名需为 3-20 位字母、数字或下划线。" };
  }

  if (requestedUsername === session.username) {
    return { ok: false, message: "新用户名不能和当前用户名相同。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const accountRows = session.accountId
    ? ((await sql`
        SELECT id
        FROM accounts
        WHERE id = ${session.accountId}
        LIMIT 1
      `) as { id: number }[])
    : ((await sql`
        SELECT id
        FROM accounts
        WHERE username = ${session.username}
        LIMIT 1
      `) as { id: number }[]);
  const account = accountRows[0];

  if (!account) {
    return { ok: false, message: "账号不存在，请重新登录。" };
  }

  const existingRows = (await sql`
    SELECT id
    FROM accounts
    WHERE username = ${requestedUsername} AND id <> ${account.id}
    LIMIT 1
  `) as { id: number }[];

  if (existingRows.length > 0) {
    return { ok: false, message: "该用户名已被使用。" };
  }

  const pendingRows = (await sql`
    SELECT id
    FROM username_change_requests
    WHERE requested_username = ${requestedUsername} AND status = 'pending' AND account_id <> ${account.id}
    LIMIT 1
  `) as { id: number }[];

  if (pendingRows.length > 0) {
    return { ok: false, message: "该用户名已有待审核申请。" };
  }

  await sql`
    INSERT INTO username_change_requests (account_id, requested_username, status)
    VALUES (${account.id}, ${requestedUsername}, 'pending')
    ON CONFLICT (account_id) WHERE status = 'pending'
    DO UPDATE SET requested_username = EXCLUDED.requested_username, created_at = NOW()
  `;

  if (!session.accountId) {
    await setCurrentSession({ ...session, accountId: account.id });
  }

  revalidatePath("/profile");
  return { ok: true, message: "用户名修改申请已提交，等待管理员审核。" };
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
  revalidatePath("/profile");
  return { ok: true, message: `${username} 已${status === "approved" ? "通过" : "拒绝"}审核。` };
}

export async function reviewUsernameChangeAction(formData: FormData): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const requestId = Number(formData.get("requestId"));
  const status = String(formData.get("status"));

  if (session?.role !== "admin") {
    return { ok: false, message: "只有管理员可以审核用户名修改。" };
  }

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return { ok: false, message: "申请不存在。" };
  }

  if (status !== "approved" && status !== "rejected") {
    return { ok: false, message: "审核状态无效。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const reviewerRows = session.accountId
    ? ((await sql`
        SELECT id
        FROM accounts
        WHERE id = ${session.accountId}
        LIMIT 1
      `) as { id: number }[])
    : ((await sql`
        SELECT id
        FROM accounts
        WHERE username = ${session.username}
        LIMIT 1
      `) as { id: number }[]);
  const reviewer = reviewerRows[0];

  if (!reviewer) {
    return { ok: false, message: "审核账号不存在，请重新登录。" };
  }

  const requestRows = (await sql`
    SELECT id, account_id, requested_username
    FROM username_change_requests
    WHERE id = ${requestId} AND status = 'pending'
    LIMIT 1
  `) as { id: number; account_id: number; requested_username: string }[];
  const request = requestRows[0];

  if (!request) {
    return { ok: false, message: "申请不存在或已审核。" };
  }

  if (status === "approved") {
    const existingRows = (await sql`
      SELECT id
      FROM accounts
      WHERE username = ${request.requested_username} AND id <> ${request.account_id}
      LIMIT 1
    `) as { id: number }[];

    if (existingRows.length > 0) {
      await sql`
        UPDATE username_change_requests
        SET status = 'rejected', reviewed_at = NOW()
        WHERE id = ${request.id}
      `;
      revalidatePath("/profile");
      return { ok: false, message: "该用户名已被占用，申请已自动拒绝。" };
    }

    await sql`
      UPDATE accounts
      SET username = ${request.requested_username}, updated_at = NOW()
      WHERE id = ${request.account_id}
    `;
  }

  await sql`
    UPDATE username_change_requests
    SET status = ${status}, reviewed_at = NOW()
    WHERE id = ${request.id}
  `;

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true, message: `用户名修改已${status === "approved" ? "通过" : "拒绝"}。` };
}

export async function reviewContributionAction(formData: FormData): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const contributionId = Number(formData.get("contributionId"));
  const status = String(formData.get("status"));

  if (session?.role !== "admin") {
    return { ok: false, message: "只有管理员可以审核投稿。" };
  }

  if (!Number.isInteger(contributionId) || contributionId <= 0) {
    return { ok: false, message: "投稿不存在。" };
  }

  if (status !== "approved" && status !== "rejected") {
    return { ok: false, message: "审核状态无效。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const contributionRows = (await sql`
    SELECT id, type, title
    FROM contributions
    WHERE id = ${contributionId} AND status = 'pending'
    LIMIT 1
  `) as { id: number; type: ContributionType; title: string }[];
  const contribution = contributionRows[0];

  if (!contribution) {
    return { ok: false, message: "投稿不存在或已审核。" };
  }

  const slug =
    status === "approved" && contribution.type === "article"
      ? await uniqueArticleSlug(contribution.title, contribution.id)
      : null;

  await sql`
    UPDATE contributions
    SET status = ${status}, slug = ${slug}, reviewed_at = NOW()
    WHERE id = ${contribution.id}
  `;

  revalidatePath("/");
  revalidatePath("/profile");
  if (slug) {
    revalidatePath(`/articles/${slug}`);
  }

  return { ok: true, message: `投稿已${status === "approved" ? "通过" : "拒绝"}。` };
}

export async function deleteContentAction(
  _previousState: AuthActionState = initialMessage,
  formData: FormData
): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const type = String(formData.get("type")) as ContentType;
  const contentKey = cleanText(formData.get("contentKey"));
  const password = cleanPassword(formData.get("password"));
  const confirmed = formData.get("confirmDelete") === "yes";

  if (session?.role !== "admin") {
    return { ok: false, message: "只有管理员可以删除内容。" };
  }

  if (type !== "article" && type !== "entry") {
    return { ok: false, message: "内容类型无效。" };
  }

  if (!contentKey) {
    return { ok: false, message: "内容不存在。" };
  }

  if (!confirmed) {
    return { ok: false, message: "请先勾选确认删除。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const accountRows = session.accountId
    ? ((await sql`
        SELECT id, password_hash, salt
        FROM accounts
        WHERE id = ${session.accountId} AND role = 'admin' AND status = 'approved'
        LIMIT 1
      `) as { id: number; password_hash: string; salt: string }[])
    : ((await sql`
        SELECT id, password_hash, salt
        FROM accounts
        WHERE username = ${session.username} AND role = 'admin' AND status = 'approved'
        LIMIT 1
      `) as { id: number; password_hash: string; salt: string }[]);
  const account = accountRows[0];

  if (!account || !passwordMatches(password, account.salt, account.password_hash)) {
    return { ok: false, message: "管理员密码不正确。" };
  }

  await sql`
    INSERT INTO content_deletions (type, content_key, deleted_by)
    VALUES (${type}, ${contentKey}, ${account.id})
    ON CONFLICT (type, content_key)
    DO UPDATE SET deleted_by = EXCLUDED.deleted_by, deleted_at = NOW()
  `;

  revalidatePath("/");
  revalidatePath("/profile");
  if (type === "article") {
    revalidatePath(`/articles/${contentKey}`);
  }

  return { ok: true, message: "内容已删除。" };
}

export async function editContentAction(
  _previousState: AuthActionState = initialMessage,
  formData: FormData
): Promise<AuthActionState> {
  const session = await getCurrentSession();
  const type = String(formData.get("type")) as ContentType;
  const contentKey = cleanText(formData.get("contentKey"));
  const title = cleanText(formData.get("title"));
  const content = cleanText(formData.get("content"));

  if (session?.role !== "admin") {
    return { ok: false, message: "只有管理员可以编辑内容。" };
  }

  if (type !== "article" && type !== "entry") {
    return { ok: false, message: "内容类型无效。" };
  }

  if (!contentKey) {
    return { ok: false, message: "内容不存在。" };
  }

  if (title.length < 1 || title.length > 80) {
    return { ok: false, message: "标题需要 1-80 个字符。" };
  }

  if (content.length < 1 || content.length > 20000) {
    return { ok: false, message: "内容需要 1-20000 个字符。" };
  }

  await ensureAuthSchema();
  const sql = getAuthSql();
  const accountRows = session.accountId
    ? ((await sql`
        SELECT id
        FROM accounts
        WHERE id = ${session.accountId} AND role = 'admin' AND status = 'approved'
        LIMIT 1
      `) as { id: number }[])
    : ((await sql`
        SELECT id
        FROM accounts
        WHERE username = ${session.username} AND role = 'admin' AND status = 'approved'
        LIMIT 1
      `) as { id: number }[]);
  const account = accountRows[0];

  if (!account) {
    return { ok: false, message: "管理员账号不存在或未通过审核。" };
  }

  await sql`
    INSERT INTO content_edits (type, content_key, title, content, updated_by)
    VALUES (${type}, ${contentKey}, ${title}, ${content}, ${account.id})
    ON CONFLICT (type, content_key)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `;

  revalidatePath("/");
  revalidatePath("/profile");
  if (type === "article") {
    revalidatePath(`/articles/${contentKey}`);
  }

  return { ok: true, message: "内容已更新。" };
}
