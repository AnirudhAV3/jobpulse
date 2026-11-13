"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Badge, PageHeader, cn } from "@/components/ui";
import type { InboxConfigDTO } from "@/lib/types";

interface ResumeState {
  id: number;
  content: string;
  updatedAt: string;
}

interface PushSettings {
  configured: boolean;
  enabled: boolean;
  publicKey: string | null;
}

function decodeVapidKey(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = window.atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default function SettingsPage() {
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [inboxCfg, setInboxCfg] = useState<InboxConfigDTO | null>(null);
  const [pushSettings, setPushSettings] = useState<PushSettings | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch("/api/resume", { cache: "no-store" }),
        fetch("/api/inbox/config", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" }),
      ]);
      if (responses.some((response) => !response.ok)) {
        throw new Error("Could not load settings.");
      }
      const [resumeData, inboxData, pushData] = await Promise.all(
        responses.map((response) => response.json())
      );
      setResume(resumeData.resume);
      setDraft(resumeData.resume?.content ?? "");
      setInboxCfg(inboxData.config);
      setPushSettings(pushData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load settings.");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save your resume.");
      setResume(data.resume);
      setNotice(`Saved. Updated keyword comparisons for ${data.rescored ?? 0} tracked roles.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save your resume.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/resume/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not read that file.");
      setDraft(data.text);
      setNotice(`Extracted ${data.words} words from ${data.fileName}. Review and save the text.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read that file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const togglePushNotifications = async () => {
    setPushBusy(true);
    setPushFeedback(null);
    try {
      if (!pushSettings?.configured || !pushSettings.publicKey) {
        throw new Error("Push notifications are not configured on this deployment.");
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support web push notifications.");
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (pushSettings.enabled) {
        if (existing) {
          const response = await fetch("/api/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Could not disable push notifications.");
          await existing.unsubscribe();
        }
        setPushSettings({ ...pushSettings, enabled: false });
        setPushFeedback("Push alerts are disabled for this device.");
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission was not granted. You can enable it in your browser settings.");
      }

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(pushSettings.publicKey) as BufferSource,
        }));
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not enable push notifications.");
      setPushSettings({ ...pushSettings, enabled: true });
      setPushFeedback("Push alerts are enabled for this device.");
    } catch (error) {
      setPushFeedback(error instanceof Error ? error.message : "Notification setup failed.");
    } finally {
      setPushBusy(false);
    }
  };

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const dirty = resume ? draft !== resume.content : draft.length > 0;

  return (
    <div>
      <PageHeader
        kicker="personal settings"
        title="Resume & Settings"
        sub="Manage the resume used for keyword comparisons, and optionally connect an inbox or enable notifications on this device."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-3" aria-labelledby="resume-heading">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void upload(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "group flex w-full items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-7 text-left transition-all",
              dragOver
                ? "border-volt bg-volt/[0.08]"
                : "border-white/15 bg-white/[0.02] hover:border-volt/40 hover:bg-volt/[0.04]"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf"
              className="hidden"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-volt/10">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-volt" />
              ) : (
                <UploadCloud className="h-5 w-5 text-volt" />
              )}
            </div>
            <div>
              <p className="font-display text-base font-semibold text-white">
                {uploading ? "Reading resume…" : "Upload resume"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-mist">
                PDF, DOCX, TXT, or Markdown
              </p>
            </div>
            <FileUp className="ml-auto h-4 w-4 text-mist group-hover:text-volt" />
          </button>

          <div className="panel p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-volt" />
                <h2 id="resume-heading" className="font-display text-lg font-semibold text-white">
                  Base resume
                </h2>
                {dirty && <Badge tone="amber">unsaved</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-mist">{words} words</span>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !dirty}
                  className="inline-flex items-center gap-2 rounded-lg bg-volt px-4 py-2.5 font-display text-xs font-bold text-ink disabled:opacity-40 sm:text-sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save resume
                </button>
              </div>
            </div>

            {notice && (
              <div role="status" className="mb-4 rounded-lg border border-volt/25 bg-volt/[0.07] px-3 py-2.5 text-sm text-volt">
                {notice}
              </div>
            )}
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              placeholder="Paste or upload your resume text here."
              className="h-[520px] w-full resize-y rounded-xl border border-white/10 bg-black/50 p-5 font-mono text-xs leading-relaxed text-white/90 focus:border-volt/40 focus:outline-none"
            />
            <p className="mt-3 text-xs leading-relaxed text-mist">
              JobPulse compares these resume keywords with tracked roles. It does not invent or
              rewrite your experience, generate an ATS score, or submit applications.
            </p>
          </div>
        </section>

        <aside className="space-y-6 lg:col-span-2">
          <section className="panel p-5" aria-labelledby="push-heading">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-mint" />
                <h2 id="push-heading" className="font-display text-lg font-semibold text-white">
                  Push notifications
                </h2>
              </div>
              <Badge tone={pushSettings?.enabled ? "volt" : "mute"}>
                {pushSettings?.enabled ? "enabled on this device" : "optional"}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              Notifications are opt-in. JobPulse asks the browser only after you select Enable; it
              never requests permission automatically at login. Push alerts currently report new
              messages imported during inbox sync.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              On iPhone, add the site to your Home Screen and open it there first. Browser and
              device support varies.
            </p>
            {pushFeedback && (
              <p role="status" className="mt-3 text-xs text-volt">{pushFeedback}</p>
            )}
            {pushSettings?.configured ? (
              <button
                type="button"
                disabled={pushBusy}
                onClick={() => void togglePushNotifications()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-mint/40 bg-mint/10 px-4 py-2.5 font-display text-xs font-bold text-mint disabled:opacity-50"
              >
                {pushBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {pushSettings.enabled ? "Disable push on this device" : "Enable push on this device"}
              </button>
            ) : (
              <p className="mt-4 rounded-lg border border-amber/25 bg-amber/5 px-3 py-2.5 text-xs text-mist">
                Push is not configured by the site administrator yet.
              </p>
            )}
          </section>

          <section className="panel p-5" aria-labelledby="inbox-heading">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-mint" />
                <h2 id="inbox-heading" className="font-display text-lg font-semibold text-white">
                  Email inbox
                </h2>
              </div>
              <Badge tone={inboxCfg?.connected ? "volt" : "amber"}>
                {inboxCfg?.connected ? "connected" : "optional"}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              {inboxCfg?.connected
                ? `Connected to ${inboxCfg.email}. Messages sync only when you request a sync or a configured worker runs.`
                : "Connect from Inbox to import relevant messages. Use a provider app password where supported; never enter your normal account password."}
            </p>
            <Link
              href="/inbox"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-mint/40 bg-mint/10 px-4 py-2.5 font-display text-xs font-bold text-mint"
            >
              {inboxCfg?.connected ? "Manage inbox" : "Inbox setup"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ember" />
              <h2 className="font-display text-lg font-semibold text-white">Job source status</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              Public Greenhouse and Lever feeds are collected by the scheduled GitHub Actions
              worker. Configure the boards in deployment settings and enable scheduled scraping
              for your account.
            </p>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold text-white">Before using a draft</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-mist">
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-mint" />Verify dates, titles, and contact details.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-mint" />Remove claims or skills that do not describe your experience.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-mint" />Submit only on the employer&apos;s verified website.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
