// ---------------------------------------------------------------------------
// Multi-tenant Session Auth & Strict Per-User Board Provisioning
// Uses Node native scrypt + HMAC-SHA256 signed, HTTP-only first-party cookies.
// ---------------------------------------------------------------------------

import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resumes, targetRoles, users } from "@/db/schema";
import type { AuthUserDTO } from "@/lib/types";

export const SESSION_COOKIE = "jobpulse_session";
export const DEFAULT_TARGET_ROLE = "Business Analyst (BA)";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AUTH_SECRET must be set to a random value of at least 32 bytes");
  }
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.includes(":")) return false;
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

interface SessionPayload {
  uid: number;
  email: string;
  exp: number;
}

export function signSessionToken(userId: number, email: string): string {
  const payload: SessionPayload = {
    uid: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed.uid || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toAuthUserDTO(u: typeof users.$inferSelect): AuthUserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    authProvider: u.authProvider ?? "credentials",
    schedulerEnabled: u.schedulerEnabled,
    intervalMinutes: u.intervalMinutes,
    lastRunAt: u.lastRunAt ? u.lastRunAt.toISOString() : null,
  };
}

export async function getCurrentUser(): Promise<typeof users.$inferSelect | null> {
  try {
    const store = await cookies();
    const cookieToken = store.get(SESSION_COOKIE)?.value;
    const payload = verifySessionToken(cookieToken);

    if (!payload) return null;

    const [byId] = await db.select().from(users).where(eq(users.id, payload.uid)).limit(1);
    if (byId) return byId;

    return null;
  } catch {
    return null;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<typeof users.$inferSelect> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Provisions a brand-new, strictly isolated empty board for a newly registered user,
 * with "Business Analyst (BA)" pre-configured as the default Target Job Role.
 */
export async function provisionFreshBoardForUser(user: typeof users.$inferSelect): Promise<void> {
  await db
    .insert(resumes)
    .values({
      userId: user.id,
      name: "My Base Resume",
      content: "",
    })
    .onConflictDoNothing({ target: resumes.userId });

  await db
    .insert(targetRoles)
    .values({
      userId: user.id,
      name: DEFAULT_TARGET_ROLE,
    })
    .onConflictDoNothing({ target: [targetRoles.userId, targetRoles.name] });
}

export function cookieOptionsForRequest(isHttps: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
