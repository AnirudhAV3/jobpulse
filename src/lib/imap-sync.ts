// ---------------------------------------------------------------------------
// Real Email Inbox Connector (Per-User Scoped, IMAP over TLS)
// + Smart Recruiter Mail Classifier
// ---------------------------------------------------------------------------

import crypto from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, emails, jobs, userSettings } from "@/db/schema";
import type { InboxConfigDTO, MailPresetId } from "@/lib/types";
import { sendPushNotification } from "@/lib/push";

const INBOX_SETTING_KEY = "inbox_config";

export const MAIL_PRESETS: Record<
  MailPresetId,
  { label: string; host: string; port: number; secure: boolean; help: string }
> = {
  gmail: {
    label: "Gmail / Google Workspace",
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    help: "Enable 2-Step Verification on your Google Account, then create an App Password if Google makes that option available for your account.",
  },
  outlook: {
    label: "Outlook / Hotmail / Microsoft 365",
    host: "outlook.office365.com",
    port: 993,
    secure: true,
    help: "Outlook IMAP OAuth is not implemented. Do not enter your Microsoft password here.",
  },
  yahoo: {
    label: "Yahoo Mail",
    host: "imap.mail.yahoo.com",
    port: 993,
    secure: true,
    help: "Go to Yahoo Account Info → Account Security → Generate app password.",
  },
  icloud: {
    label: "Apple iCloud Mail",
    host: "imap.mail.me.com",
    port: 993,
    secure: true,
    help: "Go to appleid.apple.com → Sign-In and Security → App-Specific Passwords.",
  },
};

interface StoredInboxConfig {
  enabled: boolean;
  preset: MailPresetId;
  email: string;
  password?: string;
  host: string;
  port: number;
  secure: boolean;
  recruiterOnly: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncCount?: number;
}

function maskPass(p: string | undefined): string | null {
  if (!p) return null;
  return `••••••••••••${p.slice(-4)}`;
}

function inboxEncryptionKey(): Buffer {
  const secret = process.env.INBOX_ENCRYPTION_KEY;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("INBOX_ENCRYPTION_KEY must be set to a random value of at least 32 bytes");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", inboxEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptPassword(value: string): string {
  if (!value.startsWith("enc:v1:")) return value;
  const [, , ivValue, tagValue, encryptedValue] = value.split(":");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored inbox credential has an invalid encrypted format");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    inboxEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function serializeConfig(cfg: StoredInboxConfig): string {
  return JSON.stringify({
    ...cfg,
    password: cfg.password ? encryptPassword(cfg.password) : undefined,
  });
}

async function readStoredInboxConfig(userId: number): Promise<StoredInboxConfig | null> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, INBOX_SETTING_KEY)))
    .limit(1);
  if (!rows.length) return null;

  const stored = JSON.parse(rows[0].value) as StoredInboxConfig;
  if (!["gmail", "outlook", "yahoo", "icloud"].includes(stored.preset)) {
    throw new Error("Stored inbox provider is not supported");
  }
  if (stored.password) {
    const originalPassword = stored.password;
    const encryptedPassword = stored.password.startsWith("enc:v1:")
      ? stored.password
      : encryptPassword(stored.password);
    stored.password = decryptPassword(encryptedPassword);
    if (encryptedPassword !== originalPassword) {
      await writeStoredInboxConfig(userId, stored);
    }
  }
  stored.host = MAIL_PRESETS[stored.preset].host;
  stored.port = 993;
  stored.secure = true;
  return stored;
}

async function writeStoredInboxConfig(userId: number, cfg: StoredInboxConfig): Promise<void> {
  const value = serializeConfig(cfg);
  await db
    .insert(userSettings)
    .values({
      userId,
      key: INBOX_SETTING_KEY,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userSettings.userId, userSettings.key],
      set: { value, updatedAt: new Date() },
    });
}

function effectiveConfig(stored: StoredInboxConfig | null): StoredInboxConfig {
  if (stored && stored.email && stored.host) return stored;
  return {
    enabled: stored?.enabled ?? false,
    preset: stored?.preset ?? "gmail",
    email: stored?.email ?? "",
    password: stored?.password,
    host: stored?.host || MAIL_PRESETS.gmail.host,
    port: stored?.port || 993,
    secure: stored?.secure ?? true,
    recruiterOnly: stored?.recruiterOnly ?? true,
    lastSyncAt: stored?.lastSyncAt ?? null,
    lastSyncStatus: stored?.lastSyncStatus ?? null,
    lastSyncCount: stored?.lastSyncCount ?? 0,
  };
}

export async function getInboxConfigDTO(userId: number): Promise<InboxConfigDTO> {
  const cfg = effectiveConfig(await readStoredInboxConfig(userId));
  const supported = cfg.preset !== "outlook";
  const connected = supported && Boolean(cfg.email && cfg.password && cfg.host);
  return {
    connected,
    enabled: connected && cfg.enabled,
    preset: cfg.preset,
    email: cfg.email,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    hasPassword: Boolean(cfg.password),
    maskedPassword: maskPass(cfg.password),
    recruiterOnly: cfg.recruiterOnly,
    lastSyncAt: cfg.lastSyncAt ?? null,
    lastSyncStatus: cfg.lastSyncStatus ?? null,
    lastSyncCount: cfg.lastSyncCount ?? 0,
  };
}

function normalizePassword(preset: MailPresetId, raw: string): string {
  if (preset === "gmail" || preset === "icloud") {
    return raw.replace(/\s+/g, "");
  }
  return raw.trim();
}

export async function saveInboxConfig(
  userId: number,
  input: {
    enabled?: boolean;
    preset?: MailPresetId;
    email?: string;
    password?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    recruiterOnly?: boolean;
  }
): Promise<InboxConfigDTO> {
  const prev = effectiveConfig(await readStoredInboxConfig(userId));
  const preset = input.preset ?? prev.preset;
  if (!Object.hasOwn(MAIL_PRESETS, preset)) {
    throw new Error("Select a supported email provider");
  }
  if (preset === "outlook") {
    throw new Error("Outlook mailbox sign-in requires OAuth, which is not supported yet");
  }
  const presetDefaults = MAIL_PRESETS[preset];
  const email = input.email !== undefined ? input.email.trim().toLowerCase() : prev.email;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }

  const nextPassword =
    input.password && input.password.trim().length > 0
      ? normalizePassword(preset, input.password)
      : prev.password;

  const next: StoredInboxConfig = {
    enabled: input.enabled ?? true,
    preset,
    email,
    password: nextPassword,
    host: presetDefaults.host,
    port: 993,
    secure: true,
    recruiterOnly: input.recruiterOnly ?? prev.recruiterOnly,
    lastSyncAt: prev.lastSyncAt ?? null,
    lastSyncStatus: prev.lastSyncStatus ?? null,
    lastSyncCount: prev.lastSyncCount ?? 0,
  };

  await writeStoredInboxConfig(userId, next);
  return getInboxConfigDTO(userId);
}

export async function disconnectInbox(userId: number): Promise<InboxConfigDTO> {
  await db
    .delete(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, INBOX_SETTING_KEY)));
  return getInboxConfigDTO(userId);
}

function formatImapError(err: unknown, preset: MailPresetId): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/AUTHENTICATIONFAILED|Invalid credentials|Application-specific password|WebLoginRequired/i.test(raw)) {
    if (preset === "gmail") {
      return "Gmail rejected the password. Make sure 2-Step Verification is ON and use a 16-character Google App Password (myaccount.google.com/apppasswords), not your normal Gmail password.";
    }
    return "Authentication failed — check your email address and make sure you generated an App Password (not your regular login password).";
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(raw)) {
    return `Could not reach IMAP host (${raw}). Verify hostname and port 993.`;
  }
  return raw;
}

export async function testImapConnection(
  userId: number,
  input: {
    preset: MailPresetId;
    email: string;
    password?: string;
    host?: string;
    port?: number;
    secure?: boolean;
  }
): Promise<{ ok: boolean; message: string; totalMessages?: number }> {
  const prev = effectiveConfig(await readStoredInboxConfig(userId));
  const preset = input.preset || "gmail";
  const provider = MAIL_PRESETS[preset];
  if (!provider) {
    return { ok: false, message: "Select a supported email provider." };
  }
  if (preset === "outlook") {
    return {
      ok: false,
      message: "Outlook mailbox sign-in requires OAuth, which is not supported yet.",
    };
  }
  const host = provider.host;
  const port = 993;
  const secure = true;
  const email = input.email?.trim() || prev.email;
  const passRaw = input.password?.trim() ? input.password : prev.password;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passRaw) {
    return { ok: false, message: "Enter your email address and App Password first." };
  }

  const password = normalizePassword(preset, passRaw);
  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user: email, pass: password },
    logger: false,
    connectionTimeout: 12_000,
    greetingTimeout: 10_000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const total = client.mailbox ? Number(client.mailbox.exists ?? 0) : 0;
    lock.release();
    await client.logout();
    return {
      ok: true,
      totalMessages: total,
      message: `Connected to ${host} over TLS — INBOX verified (${total.toLocaleString()} total emails).`,
    };
  } catch (err) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
    return { ok: false, message: formatImapError(err, preset) };
  }
}

// ----- Recruiter & Career Portal OTP / Confirmation Extraction ----------------

const RECRUITER_SIGNAL =
  /\b(application|applied|interview|assessment|hackerrank|codility|testgorilla|hirevue|recruiter|recruiting|talent acquisition|careers|workday|greenhouse|lever|icims|taleo|successfactors|shortlist|shortlisted|candidate|hiring|offer letter|job opening|business analyst|screening|hr team|verification code|one-time password|otp|confirm your email|activate your account)\b/i;

const VERIFICATION_SIGNAL =
  /\b(verification code|security code|one-time password|otp|passcode|verify your email|confirm your email|activate your account|account verification|confirm account)\b/i;

export function extractOtpCode(subject: string, body: string): string | null {
  const combined = `${subject}\n${body.slice(0, 1500)}`;
  if (!VERIFICATION_SIGNAL.test(combined)) return null;
  const explicit = combined.match(
    /(?:code|otp|passcode|pin)\s*(?:is|:|-)?\s*\b(\d{6})\b/i
  );
  if (explicit) return explicit[1];
  const anySix = combined.match(/\b(\d{6})\b/);
  return anySix ? anySix[1] : null;
}

export function extractConfirmUrl(subject: string, body: string): string | null {
  const combined = `${subject}\n${body.slice(0, 3000)}`;
  if (!VERIFICATION_SIGNAL.test(combined)) return null;
  const urlMatch = combined.match(
    /https?:\/\/[^\s<>"']+(?:verify|confirm|activate|validate|token=)[^\s<>"']*/i
  );
  return urlMatch ? urlMatch[0].replace(/[.,;)]+$/, "") : null;
}

export function classifyEmailType(
  subject: string,
  body: string
): "response" | "assessment" | "interview" | "rejection" | "offer" | "verification" {
  const combined = `${subject}\n${body.slice(0, 2000)}`;
  if (VERIFICATION_SIGNAL.test(combined) && (extractOtpCode(subject, body) || extractConfirmUrl(subject, body))) {
    return "verification";
  }
  if (/\b(offer letter|pleased to extend|delighted to offer|formal offer|compensation package)\b/i.test(combined)) {
    return "offer";
  }
  if (
    /\b(online assessment|hackerrank|codility|testgorilla|hirevue|assessment invitation|coding test|sql test|take-home|case study assignment|aptitude test)\b/i.test(
      combined
    )
  ) {
    return "assessment";
  }
  if (
    /\b(interview invitation|schedule an interview|first-round interview|technical round|screening call|schedule a call|availability for a call|calendly\.com|zoom\.us|meet\.google\.com|teams\.microsoft\.com)\b/i.test(
      combined
    )
  ) {
    return "interview";
  }
  if (
    /\b(unfortunately|move forward with other candidates|not moving forward|will not be proceeding|regret to inform|pursue other candidates)\b/i.test(
      combined
    )
  ) {
    return "rejection";
  }
  return "response";
}

function inferCompanyName(
  fromName: string,
  fromAddress: string,
  subject: string,
  knownApps: { appId: number; company: string }[]
): { company: string; applicationId: number | null } {
  const hay = `${fromName} ${fromAddress} ${subject}`.toLowerCase();
  for (const k of knownApps) {
    if (hay.includes(k.company.toLowerCase())) {
      return { company: k.company, applicationId: k.appId };
    }
  }
  const cleanedName = fromName
    .replace(/\b(talent acquisition|recruiting|recruitment|careers|hr|team|no-reply|noreply|workday|greenhouse|lever|verification)\b/gi, "")
    .replace(/[<>"'|()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanedName.length >= 2 && cleanedName.length <= 36 && !cleanedName.includes("@")) {
    return { company: cleanedName, applicationId: null };
  }
  const domainPart = (fromAddress.split("@")[1] ?? "company.com").split(".")[0] ?? "Company";
  const pretty = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
  return { company: pretty, applicationId: null };
}

export async function syncImapInbox(userId: number): Promise<{
  ok: boolean;
  imported: number;
  scanned: number;
  message: string;
}> {
  const stored = await readStoredInboxConfig(userId);
  const cfg = effectiveConfig(stored);
  if (cfg.preset === "outlook") {
    return {
      ok: false,
      imported: 0,
      scanned: 0,
      message: "Outlook mailbox sign-in requires OAuth, which is not supported yet.",
    };
  }
  if (!cfg.enabled || !cfg.email || !cfg.password || !cfg.host) {
    return {
      ok: false,
      imported: 0,
      scanned: 0,
      message: "No active mailbox connection. Connect a supported mailbox to sync messages.",
    };
  }

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.email, pass: cfg.password },
    logger: false,
    connectionTimeout: 14_000,
    greetingTimeout: 10_000,
  });

  let imported = 0;
  let scanned = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const appRows = await db
        .select({ appId: applications.id, company: jobs.company })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.userId, userId))
        .orderBy(desc(applications.createdAt));

      const total = client.mailbox ? Number(client.mailbox.exists ?? 0) : 0;
      if (total > 0) {
        const startSeq = Math.max(1, total - 29);
        const range = `${startSeq}:*`;

        for await (const msg of client.fetch(range, {
          envelope: true,
          source: true,
          uid: true,
          internalDate: true,
        })) {
          scanned++;
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const subject = (parsed.subject || msg.envelope?.subject || "(No subject)").trim();
          const fromObj = parsed.from?.value?.[0];
          const fromAddress = fromObj?.address || msg.envelope?.from?.[0]?.address || "unknown@sender";
          const fromName = fromObj?.name || msg.envelope?.from?.[0]?.name || "";
          const bodyText = (parsed.text || "").trim().slice(0, 8000);
          const msgId =
            parsed.messageId ||
            msg.envelope?.messageId ||
            `imap-${cfg.email}-${msg.uid}`;

          const isRecruiter =
            RECRUITER_SIGNAL.test(`${fromName} ${fromAddress} ${subject} ${bodyText.slice(0, 1200)}`) ||
            appRows.some((a) =>
              `${fromName} ${fromAddress} ${subject}`.toLowerCase().includes(a.company.toLowerCase())
            );

          if (cfg.recruiterOnly && !isRecruiter) continue;

          const { company, applicationId } = inferCompanyName(
            fromName,
            fromAddress,
            subject,
            appRows
          );
          const type = classifyEmailType(subject, bodyText);
          const otpCode = extractOtpCode(subject, bodyText);
          const confirmUrl = extractConfirmUrl(subject, bodyText);
          const receivedAt =
            parsed.date instanceof Date
              ? parsed.date
              : msg.internalDate instanceof Date
                ? msg.internalDate
                : new Date();

          const inserted = await db
            .insert(emails)
            .values({
              userId,
              messageId: msgId,
              source: "imap",
              applicationId,
              company,
              fromAddress,
              subject,
              body: bodyText || "(HTML-only message — open in your email client for rich layout)",
              type,
              otpCode,
              confirmUrl,
              read: false,
              receivedAt,
            })
            .onConflictDoNothing({ target: [emails.userId, emails.messageId] })
            .returning({ id: emails.id });

          if (inserted.length > 0) imported++;
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    const updatedCfg: StoredInboxConfig = {
      ...cfg,
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "ok",
      lastSyncCount: imported,
    };
    await writeStoredInboxConfig(userId, updatedCfg);

    if (imported > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.URL;
      if (!appUrl) {
        console.error("[push] Set NEXT_PUBLIC_APP_URL to enable push notification links");
      } else {
        try {
          await sendPushNotification(userId, {
            title: `${imported} new inbox message${imported === 1 ? "" : "s"}`,
            body: "Open JobPulse to review your inbox.",
            url: new URL("/inbox", appUrl).toString(),
          });
        } catch (error) {
          console.error("[push] Could not deliver inbox update", error);
        }
      }
    }

    return {
      ok: true,
      imported,
      scanned,
      message:
        imported > 0
          ? `Synced ${imported} new email(s) from ${cfg.email}.`
          : `Checked ${scanned} recent message(s) in ${cfg.email} — inbox is up to date.`,
    };
  } catch (err) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
    const errMsg = formatImapError(err, cfg.preset);
    await writeStoredInboxConfig(userId, {
      ...cfg,
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: `error: ${errMsg.slice(0, 120)}`,
    });
    return { ok: false, imported: 0, scanned: 0, message: errMsg };
  }
}
