import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  cookieOptionsForRequest,
  hashPassword,
  provisionFreshBoardForUser,
  SESSION_COOKIE,
  signSessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type Provider = "google" | "outlook" | "linkedin";

const STATE_COOKIE = "jobpulse_oauth_state";
const VERIFIER_COOKIE = "jobpulse_oauth_verifier";

const PROVIDERS: Record<
  Provider,
  {
    clientId: string | undefined;
    clientSecret: string | undefined;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    scope: string;
  }
> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
  },
  outlook: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
    scope: "openid email profile User.Read",
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
    tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoEndpoint: "https://api.linkedin.com/v2/userinfo",
    scope: "openid profile email",
  },
};

function isProvider(value: string | null): value is Provider {
  return value === "google" || value === "outlook" || value === "linkedin";
}

function appOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV !== "production") {
    const requestHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (requestHost) {
      const protocol = isHttps(req) ? "https" : "http";
      return new URL(`${protocol}://${requestHost}`).origin;
    }
  }
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return configured ? new URL(configured).origin : req.nextUrl.origin;
}

function callbackUrl(req: NextRequest, provider: Provider): string {
  return `${appOrigin(req)}/api/auth/oauth?provider=${provider}`;
}

function isHttps(req: NextRequest): boolean {
  return (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol).includes("https");
}

function oauthCookieOptions(https: boolean) {
  return {
    httpOnly: true,
    secure: https,
    sameSite: "lax" as const,
    path: "/api/auth/oauth",
    maxAge: 600,
  };
}

function redirectToLogin(req: NextRequest, error: string): NextResponse {
  const destination = new URL("/", appOrigin(req));
  destination.searchParams.set("authError", error);
  return NextResponse.redirect(destination);
}

async function beginAuthorization(req: NextRequest, provider: Provider): Promise<NextResponse> {
  const config = PROVIDERS[provider];
  if (!config.clientId || !config.clientSecret) return redirectToLogin(req, "oauth_not_configured");

  const state = crypto.randomBytes(32).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const authorization = new URL(config.authorizationEndpoint);
  authorization.searchParams.set("client_id", config.clientId);
  authorization.searchParams.set("redirect_uri", callbackUrl(req, provider));
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", config.scope);
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("code_challenge", challenge);
  authorization.searchParams.set("code_challenge_method", "S256");
  if (provider === "google") authorization.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorization);
  const options = oauthCookieOptions(isHttps(req));
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(VERIFIER_COOKIE, verifier, options);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function finishAuthorization(req: NextRequest, provider: Provider): Promise<NextResponse> {
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  const verifier = req.cookies.get(VERIFIER_COOKIE)?.value;
  const code = req.nextUrl.searchParams.get("code");
  const config = PROVIDERS[provider];
  if (!state || !expectedState || state !== expectedState || !verifier || !code) {
    return redirectToLogin(req, "oauth_state_invalid");
  }
  if (!config.clientId || !config.clientSecret) {
    return redirectToLogin(req, "oauth_not_configured");
  }

  const redirectUri = callbackUrl(req, provider);
  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!tokenResponse.ok) throw new Error(`${provider} token exchange failed`);
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error(`${provider} token response omitted access token`);

  const profileResponse = await fetch(config.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!profileResponse.ok) throw new Error(`${provider} user profile request failed`);
  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    preferred_username?: string;
    name?: string;
  };
  const subject = profile.sub?.trim();
  const email = (profile.email ?? profile.preferred_username ?? "").trim().toLowerCase();
  const emailVerified = profile.email_verified === true;
  if (!subject || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error(`${provider} returned an incomplete account profile`);
  }

  const [providerIdentity] = await db
    .select()
    .from(users)
    .where(and(eq(users.authProvider, provider), eq(users.oauthSubject, subject)))
    .limit(1);
  let user: typeof users.$inferSelect;
  if (providerIdentity) {
    user = providerIdentity;
  } else {
    const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) {
      const verifiedAccountLink =
        emailVerified &&
        (existingEmail.authProvider === "credentials" ||
          (existingEmail.authProvider === provider && !existingEmail.oauthSubject));
      if (!verifiedAccountLink) {
        return redirectToLogin(
          req,
          emailVerified ? "account_provider_mismatch" : "oauth_email_unverified"
        );
      }

      const [updated] = await db
        .update(users)
        .set({ authProvider: provider, oauthSubject: subject })
        .where(eq(users.id, existingEmail.id))
        .returning();
      user = updated;
    } else {
      if (!emailVerified && provider !== "outlook") {
        return redirectToLogin(req, "oauth_email_unverified");
      }

      const [created] = await db
        .insert(users)
        .values({
          email,
          name: profile.name?.trim() || email.split("@")[0],
          passwordHash: hashPassword(crypto.randomBytes(48).toString("hex")),
          authProvider: provider,
          oauthSubject: subject,
        })
        .returning();
      await provisionFreshBoardForUser(created);
      user = created;
    }
  }

  const response = NextResponse.redirect(new URL("/", appOrigin(req)));
  response.cookies.set(
    SESSION_COOKIE,
    signSessionToken(user.id, user.email),
    cookieOptionsForRequest(isHttps(req))
  );
  const options = oauthCookieOptions(isHttps(req));
  response.cookies.set(STATE_COOKIE, "", { ...options, maxAge: 0 });
  response.cookies.set(VERIFIER_COOKIE, "", { ...options, maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(req: NextRequest) {
  const providerValue = req.nextUrl.searchParams.get("provider");
  if (!isProvider(providerValue)) {
    return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 400 });
  }

  try {
    if (req.nextUrl.searchParams.has("error")) {
      return redirectToLogin(req, "provider_authorization_failed");
    }
    if (req.nextUrl.searchParams.has("code")) {
      return await finishAuthorization(req, providerValue);
    }
    return await beginAuthorization(req, providerValue);
  } catch (error) {
    console.error("[api/auth/oauth GET]", error);
    return redirectToLogin(req, "oauth_failed");
  }
}
