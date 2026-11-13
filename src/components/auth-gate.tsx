"use client";

import { useEffect, useState, type FormEvent } from "react";
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

type SocialProvider = "google" | "outlook" | "linkedin";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.26-.97 2.33-2.06 3.05l3.33 2.58c1.94-1.79 3.06-4.43 3.06-7.55 0-.73-.07-1.43-.19-2.1H12z" />
      <path fill="#34A853" d="M12 22c2.78 0 5.12-.92 6.82-2.49l-3.33-2.58c-.92.62-2.1.99-3.49.99-2.68 0-4.95-1.81-5.76-4.24H2.8v2.66C4.5 19.72 7.98 22 12 22z" />
      <path fill="#FBBC05" d="M6.24 13.68A6.04 6.04 0 0 1 5.92 12c0-.58.11-1.15.32-1.68V7.66H2.8A9.98 9.98 0 0 0 2 12c0 1.61.39 3.14 1.08 4.34l3.16-2.66z" />
      <path fill="#4285F4" d="M12 5.98c1.51 0 2.87.52 3.94 1.54l2.95-2.95C17.11 2.91 14.78 2 12 2 7.98 2 4.5 4.28 2.8 7.66l3.44 2.66C7.05 7.79 9.32 5.98 12 5.98z" />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" rx="1" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" rx="1" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" rx="1" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path fill="#FFFFFF" d="M7.2 9.6H4.5V19h2.7V9.6zM5.85 8.35a1.58 1.58 0 1 0 0-3.16 1.58 1.58 0 0 0 0 3.16zM19.5 19h-2.7v-4.6c0-1.1-.02-2.51-1.53-2.51-1.53 0-1.76 1.2-1.76 2.43V19h-2.7V9.6h2.59v1.28h.04c.36-.68 1.24-1.4 2.55-1.4 2.73 0 3.24 1.8 3.24 4.14V19z" />
    </svg>
  );
}

const PROVIDERS: {
  id: SocialProvider;
  label: string;
  icon: typeof GoogleIcon;
}[] = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "outlook", label: "Outlook", icon: OutlookIcon },
  { id: "linkedin", label: "LinkedIn", icon: LinkedInIcon },
];

const OAUTH_ERRORS: Record<string, string> = {
  oauth_not_configured:
    "Sign-in with this provider is not configured yet. Add its OAuth client ID and secret in Netlify, then redeploy.",
  account_provider_mismatch: "This email is already linked to another sign-in method. Use that method to sign in.",
  oauth_state_invalid: "The sign-in request expired or could not be verified. Please try again.",
  provider_authorization_failed: "The provider cancelled or could not complete sign-in.",
  oauth_email_unverified: "Your provider did not confirm this email address. Verify it with the provider and try again.",
  oauth_failed: "Sign-in could not be completed. Check the provider configuration and try again.",
};

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

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthError =
      url.searchParams.get("authError") ??
      window.sessionStorage.getItem("jobpulse_oauth_error");
    if (!oauthError) return;
    const timer = window.setTimeout(
      () => setError(OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again."),
      0
    );
    window.sessionStorage.removeItem("jobpulse_oauth_error");
    if (url.searchParams.has("authError")) {
      url.searchParams.delete("authError");
      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    }
    return () => window.clearTimeout(timer);
  }, []);

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

  const startOAuth = (provider: SocialProvider) => {
    // This navigation starts the authorization-code flow and must reach the server route.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/oauth?provider=${provider}`);
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

          <div className="mt-5">
            <p className="mb-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist">
              Continue securely with
            </p>
            <div className="grid gap-2">
              {PROVIDERS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => startOAuth(id)}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-volt/40 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
                >
                  <Icon />
                  Continue with {label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-mist/70">
              or use email
            </span>
            <span className="h-px flex-1 bg-white/10" />
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
