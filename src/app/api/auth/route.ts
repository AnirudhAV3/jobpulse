import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  cookieOptionsForRequest,
  getCurrentUser,
  hashPassword,
  provisionFreshBoardForUser,
  SESSION_COOKIE,
  signSessionToken,
  toAuthUserDTO,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function isHttpsRequest(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
  return proto.includes("https");
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user: toAuthUserDTO(user) });
  } catch (err) {
    console.error("[api/auth GET]", err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mode?: "login" | "register";
      name?: string;
      email?: string;
      password?: string;
    };

    const mode = body.mode ?? "login";
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const https = isHttpsRequest(req);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!password || (mode === "register" && password.length < 12)) {
      return NextResponse.json(
        { error: "Use a password with at least 12 characters" },
        { status: 400 }
      );
    }

    if (mode === "register") {
      const name = (body.name ?? "").trim();
      if (!name || name.length < 2) {
        return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists. Sign in instead." },
          { status: 409 }
        );
      }

      const [created] = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash: hashPassword(password),
          schedulerEnabled: true,
          intervalMinutes: 5,
        })
        .returning();

      await provisionFreshBoardForUser(created);

      const token = signSessionToken(created.id, created.email);
      const res = NextResponse.json({
        authenticated: true,
        user: toAuthUserDTO(created),
        isNewBoard: true,
      });
      res.cookies.set(SESSION_COOKIE, token, cookieOptionsForRequest(https));
      return res;
    }

    const [found] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = signSessionToken(found.id, found.email);
    const res = NextResponse.json({
      authenticated: true,
      user: toAuthUserDTO(found),
      isNewBoard: false,
    });
    res.cookies.set(SESSION_COOKIE, token, cookieOptionsForRequest(https));
    return res;
  } catch (err) {
    console.error("[api/auth POST]", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const https = isHttpsRequest(req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptionsForRequest(https),
    maxAge: 0,
  });
  return res;
}
