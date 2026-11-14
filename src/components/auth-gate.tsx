"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import LoginAbstractBackground from "@/components/login-background";
import { cn } from "@/components/ui";
import type { AuthUserDTO } from "@/lib/types";

const FEATURES = [
  {
    icon: BriefcaseBusiness,
    title: "A focused job board",
    description: "Organize tracked openings by role, location, and workplace type.",
  },
  {
    icon: FileCheck2,
    title: "Eight ATS-style resume checks",
    description: "See estimated keyword and formatting signals across eight heuristic profiles—not employer ATS integrations.",
  },
  {
    icon: CheckCircle2,
    title: "A clearer application pipeline",
    description: "Shortlist roles, prepare resume-comparison drafts, and track submissions you confirm.",
  },
  {
    icon: Mail,
    title: "Optional inbox and alerts",
    description: "Connect an inbox or enable device alerts separately, only when you choose.",
  },
];

export default function AuthGate({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUserDTO) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mode,
          name: mode === "register" ? name : undefined,
          email,
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.user) {
        setError(data.error ?? "Could not sign in. Please try again.");
        return;
      }
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:py-10">
      <LoginAbstractBackground />

      <div className="gradient-border relative z-10 grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/12 bg-[#070b0a]/85 shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_70px_rgba(182,255,60,0.08)] backdrop-blur-2xl md:grid-cols-11 animate-fade-up">
        <section className="flex flex-col justify-between border-b border-white/[0.07] bg-gradient-to-br from-volt/[0.09] via-transparent to-mint/[0.05] p-6 sm:p-8 md:col-span-5 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt">
                <Zap className="h-5 w-5 text-ink" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-display text-lg font-bold leading-none text-white">
                  JOB<span className="text-volt">PULSE</span>
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-mist">
                  your focused job search
                </p>
              </div>
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-volt">
              Find focus. Make your next move.
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-[2.1rem]">
              Your job search, moving forward.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-mist">
              Opportunities, resume insights, and application tracking—all in one private workspace.
            </p>

            <ul className="mt-7 space-y-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-volt/20 bg-volt/[0.08]">
                    <Icon className="h-4 w-4 text-volt" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-mist">{description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 rounded-xl border border-white/10 bg-black/35 p-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
              <p className="font-mono text-[10px] leading-relaxed text-mist">
                Your resume and search stay private to your account. Inbox and device alerts are optional. JobPulse prepares drafts; you review and submit applications yourself.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-8 md:col-span-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
              {mode === "login" ? "Welcome back" : "Get started"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              {mode === "login" ? "Sign in to JobPulse" : "Create your account"}
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/10 bg-black/40 p-1">
            {(["login", "register"] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => {
                  setMode(nextMode);
                  setError(null);
                }}
                className={cn(
                  "rounded-lg py-2.5 font-display text-xs font-bold transition-all sm:text-sm",
                  mode === nextMode ? "bg-volt text-ink" : "text-mist hover:text-white"
                )}
              >
                {nextMode === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mist">
                  Full name
                </label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
                  <input
                    id="auth-name"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 py-3 pl-10 pr-3 text-sm text-white placeholder:text-mist/40 focus:border-volt/50 focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mist">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 py-3 pl-10 pr-3 text-sm text-white placeholder:text-mist/40 focus:border-volt/50 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mist">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
                <input
                  id="auth-password"
                  type={showPass ? "text" : "password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  minLength={mode === "register" ? 12 : 1}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 py-3 pl-10 pr-11 text-sm text-white placeholder:text-mist/40 focus:border-volt/50 focus:outline-none"
                  placeholder={mode === "register" ? "At least 12 characters" : "Your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((shown) => !shown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-white"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "register" && (
                <p className="mt-1.5 font-mono text-[10px] text-mist/70">
                  Use 12 or more characters. A password manager is recommended.
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose/35 bg-rose/10 px-3 py-2.5 text-xs text-rose">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-volt px-4 py-3 font-display text-sm font-bold text-ink transition-shadow hover:shadow-[0_0_26px_rgba(182,255,60,0.4)] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {mode === "login" ? "Sign In with Email" : "Create My Account"}
            </button>
          </form>

          <p className="mt-4 text-center font-mono text-[9px] leading-relaxed text-mist/65">
            Signing in does not connect your mailbox or grant device notification permissions. You can choose those separately later.
          </p>
        </section>
      </div>
    </div>
  );
}
