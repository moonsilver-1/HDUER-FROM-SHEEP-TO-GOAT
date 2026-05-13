import { createHmac, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { cookies } from "next/headers";

export type AccountRole = "admin" | "visitor";
export type AccountStatus = "approved" | "pending" | "rejected";

export type Session = {
  username: string;
  role: AccountRole;
};

export type PendingAccount = {
  username: string;
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
      (parsed.role === "admin" || parsed.role === "visitor")
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
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'visitor')),
        status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  return decodeSession(store.get(SESSION_COOKIE)?.value);
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
    SELECT username, created_at
    FROM accounts
    WHERE role = 'visitor' AND status = 'pending'
    ORDER BY created_at ASC
  `) as { username: string; created_at: string }[];

  return rows.map((row) => ({
    username: row.username,
    createdAt: new Date(row.created_at).toLocaleString("zh-CN")
  }));
}
