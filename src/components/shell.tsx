"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Radar,
  Heart,
  Send,
  Mail,
  Settings2,
  Zap,
  Menu,
  X,
  LogOut,
  Loader2,
  BellRing,
} from "lucide-react";
import AuthGate from "@/components/auth-gate";
import { cn } from "@/components/ui";
import type { AuthUserDTO, StatsDTO } from "@/lib/types";

const NAV = [
  { href: "/", label: "Command Center", short: "Home", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs Feed", short: "Jobs", icon: Radar },
  { href: "/interested", label: "Interested", short: "Saved", icon: Heart },
  { href: "/applications", label: "Applications", short: "Applied", icon: Send },
  { href: "/inbox", label: "Inbox Watch", short: "Inbox", icon: Mail },
  { href: "/settings", label: "Resume & Settings", short: "Settings", icon: Settings2 },
];

const MOBILE_BOTTOM_NAV = [
  NAV[0],
  NAV[1],
  NAV[3],
  NAV[4],
];

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<AuthUserDTO | null>(null);

  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [mailAlert, setMailAlert] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prevUnread = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        setUser(data.authenticated ? data.user : null);
      } catch {
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  const poll = useCallback(async () => {
    if (!user) return;
    try {
      const sRes = await fetch("/api/stats", { cache: "no-store" });
      if (sRes.status === 401) {
        setUser(null);
        return;
      }
      const s = await sRes.json();
      if (typeof s?.unread === "number") {
        if (prevUnread.current !== null && s.unread > prevUnread.current) {
          const delta = s.unread - prevUnread.current;
          setMailAlert(
            `${delta} new company email${delta > 1 ? "s" : ""} arrived in Inbox Watch`
          );
        }
        prevUnread.current = s.unread;
      }
      setStats(s);
    } catch {
      /* keep polling */
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timeout = window.setTimeout(() => void poll(), 0);
    const interval = window.setInterval(() => void poll(), 8_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [user, poll]);

  const signOut = async () => {
    await fetch("/api/auth", { method: "DELETE", credentials: "include" }).catch(() => null);
    setUser(null);
    setStats(null);
    setMailAlert(null);
    prevUnread.current = null;
    setMobileMenuOpen(false);
  };

  if (authChecking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-mist">
          <Loader2 className="h-4 w-4 animate-spin text-volt" /> Loading private workspace…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        onAuthenticated={(authedUser) => {
          setStats(null);
          prevUnread.current = null;
          setUser(authedUser);
        }}
      />
    );
  }

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-[100dvh]">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/4 h-[480px] w-[680px] rounded-full bg-volt/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-mint/[0.07] blur-[130px]" />
      </div>

      {/* Mobile & Tablet sticky top bar (<lg) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#070a09]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt">
            <Zap className="h-4 w-4 text-ink" strokeWidth={2.5} />
          </div>
          <span className="font-display text-base font-bold text-white">
            JOB<span className="text-volt">PULSE</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="rounded-lg border border-white/10 p-2 text-mist hover:text-white"
            aria-label="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="rounded-lg border border-white/10 p-2 text-mist hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/65 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.06] bg-[#070a09]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* brand */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 px-6 pb-6 pt-6"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-volt">
            <Zap className="h-5 w-5 text-ink" strokeWidth={2.5} />
            <div className="absolute inset-0 rounded-xl bg-volt blur-md opacity-40" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-none tracking-tight text-white">
              JOB<span className="text-volt">PULSE</span>
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-mist">
              personal job workspace
            </p>
          </div>
        </Link>

        {/* Logged-in user private board badge */}
        <div className="mx-3 mb-4 flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-volt/15 font-display text-xs font-bold text-volt">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{user.name}</p>
              <p className="truncate font-mono text-[10px] text-mist">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 rounded-lg border border-white/10 p-1.5 text-mist transition-colors hover:border-rose/40 hover:text-rose"
            title="Sign out of private board"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const badgeCount = item.href === "/inbox" ? (stats?.unread ?? 0) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-300",
                  active
                    ? "bg-volt/10 text-volt"
                    : "text-mist hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-volt shadow-[0_0_12px_rgba(182,255,60,0.8)]" />
                )}
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                <span className="font-medium">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold text-ink",
                      "bg-rose"
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* tracked jobs */}
        <div className="mx-3 mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-mist">
            jobs on your board
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-white">
            {stats ? stats.jobsScraped : "—"}
          </p>
        </div>

        {/* scraper status */}
        <div className="mx-3 mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-mist">
            background scraper
          </p>
          <p className="mt-2 text-xs font-semibold text-ember">GitHub Actions · 5-minute schedule</p>
          <p className="mt-1 font-mono text-[9px] leading-relaxed text-mist/60">
            Configured employer feeds run for accounts with scheduled scraping enabled.
          </p>
        </div>
      </aside>

      {/* Incoming company email toast */}
      {mailAlert && pathname !== "/inbox" && (
        <div className="fixed bottom-20 left-3 right-3 z-50 flex items-center gap-3 rounded-xl border border-volt/40 bg-[#0b1207]/95 px-4 py-3.5 shadow-[0_0_40px_rgba(182,255,60,0.2)] backdrop-blur-md animate-fade-up sm:left-auto sm:right-6 sm:max-w-sm lg:bottom-6">
          <BellRing className="h-4 w-4 shrink-0 text-volt" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-white">{mailAlert}</p>
            <Link
              href="/inbox"
              onClick={() => setMailAlert(null)}
              className="font-mono text-[10px] uppercase tracking-widest text-volt hover:underline"
            >
              open inbox watch →
            </Link>
          </div>
          <button
            onClick={() => setMailAlert(null)}
            className="ml-1 text-mist hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <main className="relative z-10 min-h-[100dvh] px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-20 lg:pt-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile & Tablet fixed bottom navigation bar (<lg) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/[0.08] bg-[#070a09]/95 px-1 py-1.5 backdrop-blur-xl lg:hidden">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const badge =
            item.href === "/inbox"
              ? (stats?.unread ?? 0)
              : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 transition-colors",
                active ? "text-volt" : "text-mist hover:text-white"
              )}
            >
              <div className="relative">
                <item.icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 font-mono text-[9px] font-bold text-ink">
                    {badge}
                  </span>
                )}
              </div>
              <span className="font-mono text-[9px] tracking-wide">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
