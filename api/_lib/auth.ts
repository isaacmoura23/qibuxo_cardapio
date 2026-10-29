import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parseCookies, type Req } from "./http.js";
import { readJson, writeJson } from "./blob.js";

export const COOKIE = "qb_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_PATH = "auth/password.json";
const ATTEMPTS_PATH = "auth/attempts.json";
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET não configurado");
  return s;
};

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createSessionCookie(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS })).toString("base64url");
  return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`;
}

export const clearSessionCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

export function isAuthenticated(req: Req): boolean {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (!token) return false;
    const [payload, sig] = token.split(".");
    if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

interface StoredPassword {
  salt: string;
  hash: string;
}

const hashPassword = (pw: string, salt: string) => scryptSync(pw, salt, 32).toString("hex");

/** A senha trocada no painel vale mais que a senha inicial (variável de ambiente). */
export async function checkPassword(pw: string): Promise<boolean> {
  if (!pw || pw.length > 200) return false;
  const stored = await readJson<StoredPassword>(PASSWORD_PATH);
  if (stored) return safeEqual(hashPassword(pw, stored.data.salt), stored.data.hash);
  const initial = process.env.ADMIN_PASSWORD ?? "";
  return initial.length >= 8 && safeEqual(pw, initial);
}

export async function setPassword(pw: string): Promise<void> {
  const salt = randomBytes(16).toString("hex");
  await writeJson(PASSWORD_PATH, { salt, hash: hashPassword(pw, salt) } satisfies StoredPassword);
}

interface Attempts {
  fails: number;
  until: number;
}

export async function lockedFor(): Promise<number> {
  const a = await readJson<Attempts>(ATTEMPTS_PATH);
  return a && a.data.until > Date.now() ? Math.ceil((a.data.until - Date.now()) / 60000) : 0;
}

export async function recordLogin(ok: boolean): Promise<void> {
  const cur = (await readJson<Attempts>(ATTEMPTS_PATH))?.data ?? { fails: 0, until: 0 };
  if (ok) {
    if (cur.fails > 0) await writeJson(ATTEMPTS_PATH, { fails: 0, until: 0 });
    return;
  }
  const fails = cur.fails + 1;
  await writeJson(ATTEMPTS_PATH, fails >= MAX_FAILS ? { fails: 0, until: Date.now() + LOCK_MS } : { fails, until: 0 });
}
