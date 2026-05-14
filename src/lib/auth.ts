import { createHmac, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { cookies } from "next/headers";

export type AccountRole = "admin" | "visitor";
export type AccountStatus = "approved" | "pending" | "rejected";

export type Session = {
  accountId?: number;
  username: string;
  role: AccountRole;
};

export type PendingAccount = {
  username: string;
  studentId: string | null;
  createdAt: string;
};

export type PendingUsernameChange = {
  id: number;
  currentUsername: string;
  requestedUsername: string;
  createdAt: string;
};

export type ContributionType = "article" | "entry";
export type ContentType = "article" | "entry";
export type PendingContribution = {
  id: number;
  type: ContributionType;
  title: string;
  signature: string;
  content: string;
  authorUsername: string;
  createdAt: string;
};

const SESSION_COOKIE = "hdu_session";
const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

let sqlClient: NeonQueryFunction<false, false> | null = null;
let schemaReady = false;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL;
}

function getSql() {
  const url = databaseUrl();

  if (!url) {
    throw new Error("DATABASE_URL or STORAGE_URL is not configured.");
  }

  if (!sqlClient) {
    sqlClient = neon(url);
  }

  return sqlClient;
}

function authSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "local-dev-secret";
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string) {
  const { hash } = hashPassword(password, salt);
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(storedHash, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

export function createPasswordRecord(password: string) {
  return hashPassword(password);
}

export function passwordMatches(password: string, salt: string, storedHash: string) {
  return verifyPassword(password, salt, storedHash);
}

export function databaseAvailable() {
  return Boolean(databaseUrl());
}

export function getAuthSql() {
  return getSql();
}

function signPayload(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

function encodeSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(value?: string): Session | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature || signPayload(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof parsed.username === "string" &&
      (parsed.role === "admin" || parsed.role === "visitor") &&
      (typeof parsed.accountId === "undefined" || typeof parsed.accountId === "number")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function ensureAuthSchema() {
  const sql = getSql();

  if (!schemaReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        student_id TEXT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'visitor')),
        status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS student_id TEXT`;
    await sql`
      CREATE TABLE IF NOT EXISTS username_change_requests (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        requested_username TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS username_change_requests_one_pending_per_account
      ON username_change_requests(account_id)
      WHERE status = 'pending'
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS contributions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('article', 'entry')),
        title TEXT NOT NULL,
        signature TEXT NOT NULL,
        content TEXT NOT NULL,
        slug TEXT UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      )
    `;
    await sql`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE`;
    await sql`
      CREATE TABLE IF NOT EXISTS content_deletions (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('article', 'entry')),
        content_key TEXT NOT NULL,
        deleted_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(type, content_key)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS content_edits (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('article', 'entry')),
        content_key TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(type, content_key)
      )
    `;
    schemaReady = true;
  }

  const { salt, hash } = hashPassword("123456", "hdu-admin-seed-salt");
  const admins = Array.from({ length: 10 }, (_, index) => `admin${index + 1}`);

  for (const username of admins) {
    await sql`
      INSERT INTO accounts (username, password_hash, salt, role, status)
      VALUES (${username}, ${hash}, ${salt}, 'admin', 'approved')
      ON CONFLICT (username) DO NOTHING
    `;
  }
}

export async function getCurrentSession() {
  const store = await cookies();
  const session = decodeSession(store.get(SESSION_COOKIE)?.value);

  if (!session?.accountId || !databaseAvailable()) {
    return session;
  }

  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, username, role, status
    FROM accounts
    WHERE id = ${session.accountId}
    LIMIT 1
  `) as {
    id: number;
    username: string;
    role: AccountRole;
    status: AccountStatus;
  }[];
  const account = rows[0];

  if (!account || account.status !== "approved") {
    return null;
  }

  return { accountId: account.id, username: account.username, role: account.role };
}

export async function setCurrentSession(session: Session | null) {
  const store = await cookies();

  if (!session) {
    store.delete(SESSION_COOKIE);
    return;
  }

  store.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function findApprovedAccount(username: string) {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT username, role, status
    FROM accounts
    WHERE username = ${username}
    LIMIT 1
  `) as {
    username: string;
    role: AccountRole;
    status: AccountStatus;
  }[];

  return rows[0] ?? null;
}

export async function listPendingAccounts(): Promise<PendingAccount[]> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT username, student_id, created_at
    FROM accounts
    WHERE role = 'visitor' AND status = 'pending'
    ORDER BY created_at ASC
  `) as { username: string; student_id: string | null; created_at: string }[];

  return rows.map((row) => ({
    username: row.username,
    studentId: row.student_id,
    createdAt: new Date(row.created_at).toLocaleString("zh-CN")
  }));
}

export async function listPendingUsernameChanges(): Promise<PendingUsernameChange[]> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      requests.id,
      accounts.username,
      requests.requested_username,
      requests.created_at
    FROM username_change_requests requests
    JOIN accounts ON accounts.id = requests.account_id
    WHERE requests.status = 'pending'
    ORDER BY requests.created_at ASC
  `) as {
    id: number;
    username: string;
    requested_username: string;
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    currentUsername: row.username,
    requestedUsername: row.requested_username,
    createdAt: new Date(row.created_at).toLocaleString("zh-CN")
  }));
}

export async function listPendingContributions(): Promise<PendingContribution[]> {
  await ensureAuthSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      contributions.id,
      contributions.type,
      contributions.title,
      contributions.signature,
      contributions.content,
      contributions.created_at,
      accounts.username
    FROM contributions
    JOIN accounts ON accounts.id = contributions.account_id
    WHERE contributions.status = 'pending'
    ORDER BY contributions.created_at ASC
  `) as {
    id: number;
    type: ContributionType;
    title: string;
    signature: string;
    content: string;
    created_at: string;
    username: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    signature: row.signature,
    content: row.content,
    authorUsername: row.username,
    createdAt: new Date(row.created_at).toLocaleString("zh-CN")
  }));
}
