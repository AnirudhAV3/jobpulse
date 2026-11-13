"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  ClipboardList,
  Video,
  Ban,
  Trophy,
  MailOpen,
  CheckCheck,
  CalendarCheck2,
  PlugZap,
  RefreshCw,
  Loader2,
  ShieldCheck,
  X,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Unplug,
} from "lucide-react";
import { Badge, EmptyState, PageHeader, cn, timeAgo } from "@/components/ui";
import type { EmailDTO, InboxConfigDTO, MailPresetId } from "@/lib/types";

const TYPE_META: Record<
  string,
  { label: string; tone: "volt" | "mint" | "amber" | "rose" | "sky"; icon: typeof Mail }
> = {
  verification: { label: "OTP / Verify", tone: "mint", icon: KeyRound },
  response: { label: "Response", tone: "sky", icon: MailOpen },
  assessment: { label: "Assessment", tone: "amber", icon: ClipboardList },
  interview: { label: "Interview", tone: "volt", icon: Video },
  rejection: { label: "Closed", tone: "rose", icon: Ban },
  offer: { label: "Offer", tone: "mint", icon: Trophy },
};

const PRESETS: {
  id: MailPresetId;
  label: string;
  available?: boolean;
  steps: string[];
}[] = [
  {
    id: "gmail",
    label: "Gmail",
    steps: [
      "Turn on 2-Step Verification in your Google Account.",
      "If Google offers App Passwords for your account, create one for JobPulse in your Google Account security settings.",
      "Copy the 16-character App Password (spaces are fine) and paste it below — never use your normal Gmail password.",
    ],
  },
  {
    id: "outlook",
    label: "Outlook / 365",
    available: false,
    steps: [
      "Microsoft 365 and Outlook.com generally require OAuth for IMAP; app-password sign-in is disabled for many accounts.",
      "This connector does not implement Microsoft OAuth yet. Do not enter your Microsoft password here.",
      "Mailbox connection is not currently supported for Outlook accounts.",
    ],
  },
  {
    id: "yahoo",
    label: "Yahoo",
    steps: [
      "Open Yahoo Account Info → Account Security.",
      "Click 'Generate app password', label it JobPulse, and paste it below.",
    ],
  },
  {
    id: "icloud",
    label: "iCloud",
    steps: [
      "Open appleid.apple.com → Sign-In and Security → App-Specific Passwords.",
      "Generate a password for JobPulse and enter your @icloud.com email + password below.",
    ],
  },
];

export default function InboxPage() {
  const [list, setList] = useState<EmailDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [cfg, setCfg] = useState<InboxConfigDTO | null>(null);

  // connector modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [preset, setPreset] = useState<MailPresetId>("gmail");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [recruiterOnly, setRecruiterOnly] = useState(true);

  const [testing, setTesting] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [inboxRes, cfgRes] = await Promise.all([
          fetch("/api/inbox", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/inbox/config", { cache: "no-store" }).then((r) => r.json()),
        ]);
        const emails: EmailDTO[] = inboxRes.emails ?? [];
        setList(emails);
        if (selectedId == null && emails.length) setSelectedId(emails[0].id);
        if (cfgRes.config) {
          const c: InboxConfigDTO = cfgRes.config;
          setCfg(c);
          if (!silent) {
            setPreset(c.preset);
            setEmailInput(c.email);
            setRecruiterOnly(c.recruiterOnly);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedId]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(true), 10_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePreset = (id: MailPresetId) => {
    setPreset(id);
    setFeedback(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/inbox/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          preset,
          email: emailInput,
          password: passwordInput || undefined,
        }),
      });
      const data = await res.json();
      setFeedback({ ok: Boolean(data.ok), text: data.message ?? "Test complete" });
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Could not test the mailbox connection",
      });
    } finally {
      setTesting(false);
    }
  };

  const saveAndConnect = async () => {
    setSavingCfg(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/inbox/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          preset,
          email: emailInput,
          password: passwordInput || undefined,
          recruiterOnly,
          syncNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error ?? "Failed to save inbox settings" });
        return;
      }
      setCfg(data.config);
      setPasswordInput("");
      const syncMsg = data.sync?.message ?? "Inbox saved.";
      setFeedback({ ok: data.sync ? Boolean(data.sync.ok) : true, text: syncMsg });
      if (!data.sync || data.sync.ok) {
        setBannerMsg(syncMsg);
        await load(true);
        setTimeout(() => setModalOpen(false), 900);
      }
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save inbox settings",
      });
    } finally {
      setSavingCfg(false);
    }
  };

  const disconnect = async () => {
    try {
      const res = await fetch("/api/inbox/config", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect mailbox");
      setPasswordInput("");
      setEmailInput("");
      setFeedback({ ok: true, text: "Mailbox disconnected." });
      await load(true);
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Failed to disconnect mailbox",
      });
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setBannerMsg(null);
    try {
      const res = await fetch("/api/inbox/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Inbox sync failed");
      if (data.config) setCfg(data.config);
      setBannerMsg(data.message ?? "Inbox checked.");
      await load(true);
    } catch (error) {
      setBannerMsg(error instanceof Error ? error.message : "Inbox sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const select = async (e: EmailDTO) => {
    setSelectedId(e.id);
    setMobileShowDetail(true);
    if (!e.read) {
      setList((l) => l.map((m) => (m.id === e.id ? { ...m, read: true } : m)));
      await fetch(`/api/inbox/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    }
  };

  const markAttended = async (e: EmailDTO) => {
    setList((l) => l.map((m) => (m.id === e.id ? { ...m, attended: true } : m)));
    await fetch(`/api/inbox/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended: true }),
    });
  };

  const selected = list.find((e) => e.id === selectedId) ?? null;
  const activePreset = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];
  const presetUnavailable = activePreset.available === false;

  return (
    <div>
      <PageHeader
        kicker="company communications"
        title="Inbox Watch"
        sub="Connect a supported mailbox to detect recruiter replies, assessments, and interview invites. Mailbox access is optional and can be disconnected at any time."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="amber" className="px-3 py-1.5 text-[11px]">
              {list.filter((e) => !e.read).length} unread
            </Badge>
            {cfg?.connected && (
              <button
                onClick={() => void syncNow()}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/10 px-4 py-2.5 font-display text-xs font-bold text-mint transition-colors hover:bg-mint/20 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sync Inbox Now
              </button>
            )}
            <button
              onClick={() => {
                setFeedback(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-volt px-4 py-2.5 font-display text-xs font-bold text-ink transition-shadow hover:shadow-[0_0_26px_rgba(182,255,60,0.45)]"
            >
              <PlugZap className="h-4 w-4" strokeWidth={2.5} />
              {cfg?.connected ? "Inbox Settings" : "Connect Email Inbox"}
            </button>
          </div>
        }
      />

      {/* Connection status bar */}
      <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              cfg?.connected ? "bg-volt pulse-dot" : "bg-ember"
            )}
          />
          <div>
            {cfg?.connected ? (
              <>
                <p className="text-sm font-semibold text-white">
                  Watching live mailbox:{" "}
                  <span className="font-mono text-volt">{cfg.email}</span>{" "}
                  <span className="font-mono text-xs text-mist">({cfg.host}:{cfg.port})</span>
                </p>
                <p className="font-mono text-[11px] text-mist">
                  Last sync:{" "}
                  {cfg.lastSyncAt ? timeAgo(cfg.lastSyncAt) : "just connected"}
                  {cfg.lastSyncStatus && cfg.lastSyncStatus.startsWith("error")
                    ? ` · ${cfg.lastSyncStatus}`
                    : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">
                  No mailbox connected
                </p>
                <p className="font-mono text-[11px] text-mist">
                  Connect a supported mailbox to import recruiter-related messages. No demo messages are generated.
                </p>
              </>
            )}
          </div>
        </div>

      </div>

      {bannerMsg && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-volt/25 bg-volt/[0.07] px-4 py-3 text-sm text-volt animate-fade-up">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {bannerMsg}
          </span>
          <button onClick={() => setBannerMsg(null)} className="text-volt/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel shimmer h-96" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Inbox is quiet"
          sub="Connect a supported mailbox to import relevant recruiter messages. JobPulse does not create sample or simulated emails."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* list */}
          <div
            className={cn(
              "panel max-h-[68dvh] overflow-y-auto p-2 lg:col-span-2 lg:block",
              mobileShowDetail ? "hidden" : "block"
            )}
          >
            {list.map((e) => {
              const meta = TYPE_META[e.type] ?? TYPE_META.response;
              const active = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  onClick={() => void select(e)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    active ? "bg-volt/[0.08]" : "hover:bg-white/[0.03]"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      active ? "border-volt/40 bg-volt/10" : "border-white/[0.08] bg-white/[0.03]"
                    )}
                  >
                    <meta.icon className="h-4 w-4" style={{ color: active ? "#b6ff3c" : "#9aa79f" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-sm",
                          e.read ? "text-mist" : "font-semibold text-white"
                        )}
                      >
                        {e.company}
                      </p>
                      <span className="shrink-0 font-mono text-[9px] text-mist/70">
                        {timeAgo(e.receivedAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-mist/80">{e.subject}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {e.source === "imap" && <Badge tone="mint">mailbox</Badge>}
                      {e.otpCode && <Badge tone="volt">OTP: {e.otpCode}</Badge>}
                      {!e.read && <span className="h-1.5 w-1.5 rounded-full bg-rose" />}
                      {e.attended && (
                        <Badge tone="volt">
                          <CheckCheck className="h-2.5 w-2.5" /> attended
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* detail */}
          <div
            className={cn(
              "panel max-h-[72dvh] overflow-y-auto p-4 sm:p-6 lg:col-span-3 lg:block",
              mobileShowDetail ? "block" : "hidden"
            )}
          >
            {selected ? (
              <div className="animate-fade-up" key={selected.id}>
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="mb-3 inline-flex items-center gap-1.5 font-mono text-xs text-volt lg:hidden"
                >
                  ← Back to Inbox list
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={(TYPE_META[selected.type] ?? TYPE_META.response).tone}>
                    {(TYPE_META[selected.type] ?? TYPE_META.response).label}
                  </Badge>
                  <Badge tone="mint">
                    {selected.source === "imap" ? "synced from mailbox" : "portal notification"}
                  </Badge>
                  <span className="font-mono text-[10px] text-mist">
                    {timeAgo(selected.receivedAt)}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold leading-snug text-white sm:text-xl">
                  {selected.subject}
                </h3>
                <p className="mt-1 break-all font-mono text-xs text-mist">
                  from {selected.fromAddress}
                  {selected.jobTitle && ` · re: ${selected.jobTitle}`}
                </p>

                {/* Extracted OTP / Confirmation Link Action Strip */}
                {(selected.otpCode || selected.confirmUrl) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-mint/30 bg-mint/[0.07] px-4 py-3 text-xs">
                    {selected.otpCode && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono uppercase tracking-wider text-mist">
                          Extracted OTP:
                        </span>
                        <code className="rounded bg-black/60 px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-volt">
                          {selected.otpCode}
                        </code>
                      </div>
                    )}
                    {selected.confirmUrl && (
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono uppercase tracking-wider text-mist">
                          Confirm Link:
                        </span>
                        <span className="truncate font-mono text-mint">
                          {selected.confirmUrl}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/30 p-4 sm:p-5">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/85">
                    {selected.body}
                  </pre>
                </div>
                {(selected.type === "assessment" || selected.type === "interview") &&
                  !selected.attended && (
                    <button
                      onClick={() => void markAttended(selected)}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-volt px-4 py-2.5 font-display text-sm font-bold text-ink transition-shadow hover:shadow-[0_0_24px_rgba(182,255,60,0.4)]"
                    >
                      <CalendarCheck2 className="h-4 w-4" strokeWidth={2.5} />
                      Mark as attended
                    </button>
                  )}
                {selected.attended && (
                  <p className="mt-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-volt">
                    <CheckCheck className="h-4 w-4" /> Logged as attended in your stats
                  </p>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-xs text-mist">
                Select an email to read
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Connect Email Inbox Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="panel gradient-border max-h-[92vh] w-full max-w-2xl overflow-y-auto p-7 animate-fade-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-volt">
                  live imap connector
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  Connect Your Email Inbox
                </h3>
                <p className="mt-1 text-xs text-mist">
                  Read-only TLS connection — JobPulse scans incoming mail for recruiter replies,
                  assessment links, and interview invites when inbox sync runs.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-white/10 p-2 text-mist hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Provider tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePreset(p.id)}
                  disabled={p.available === false}
                  className={cn(
                    "rounded-lg border px-3.5 py-2 font-mono text-xs transition-colors",
                    preset === p.id
                      ? "border-volt/50 bg-volt/15 text-volt"
                      : "border-white/10 bg-white/[0.03] text-mist hover:text-white",
                    p.available === false && "cursor-not-allowed opacity-40"
                  )}
                >
                  {p.label}{p.available === false ? " (unavailable)" : ""}
                </button>
              ))}
            </div>

            {/* Step-by-step instructions */}
            <div className="mt-4 rounded-xl border border-mint/20 bg-mint/[0.05] p-4">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-mint">
                <KeyRound className="h-3.5 w-3.5" /> Quick setup for {activePreset.label}
              </p>
              <ol className="space-y-1.5 text-xs leading-relaxed text-white/85">
                {activePreset.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-mono text-mint">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Form fields */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-mist">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={presetUnavailable}
                  placeholder="you@gmail.com"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder:text-mist/40 focus:border-volt/50 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-mist">
                  App Password{" "}
                  {cfg?.hasPassword && cfg.maskedPassword && (
                    <span className="text-volt">(saved: {cfg.maskedPassword})</span>
                  )}
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={presetUnavailable}
                  placeholder={
                    cfg?.hasPassword
                      ? "Leave blank to keep saved password, or paste new App Password"
                      : "abcd efgh ijkl mnop (16-char App Password)"
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-mist/40 focus:border-volt/50 focus:outline-none"
                />
              </div>

            </div>

            <div className="mt-4 space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs text-mist">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={recruiterOnly}
                  onChange={(e) => setRecruiterOnly(e.target.checked)}
                  className="accent-[#b6ff3c]"
                />
                <span>
                  Smart Recruiter Filter — only import job applications, assessments, interviews &
                  HR replies (ignores newsletters & personal emails)
                </span>
              </label>
            </div>

            {feedback && (
              <div
                className={cn(
                  "mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed",
                  feedback.ok
                    ? "border-volt/30 bg-volt/10 text-volt"
                    : "border-rose/35 bg-rose/10 text-rose"
                )}
              >
                {feedback.ok ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={testing || presetUnavailable}
                  onClick={() => void testConnection()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-display text-sm font-semibold text-white transition-colors hover:border-mint/50 hover:text-mint disabled:opacity-40"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Test Connection
                </button>
                <button
                  type="button"
                  disabled={savingCfg || presetUnavailable}
                  onClick={() => void saveAndConnect()}
                  className="inline-flex items-center gap-2 rounded-lg bg-volt px-5 py-2.5 font-display text-sm font-bold text-ink transition-shadow hover:shadow-[0_0_24px_rgba(182,255,60,0.45)] disabled:opacity-40"
                >
                  {savingCfg ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                  Save & Sync Inbox
                </button>
              </div>

              {cfg?.connected && (
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose/30 px-3 py-2 font-mono text-xs text-rose hover:bg-rose/10"
                >
                  <Unplug className="h-3.5 w-3.5" /> Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
