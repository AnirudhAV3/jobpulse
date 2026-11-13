"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------- time & salary formatting ---------------------------------------
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string
): string {
  if (min == null || max == null) return "Comp: undisclosed";
  if (currency === "INR") {
    const f = (n: number) => {
      const l = n / 100000;
      return l % 1 === 0 ? `${l}` : l.toFixed(1);
    };
    return `₹${f(min)}–${f(max)} LPA`;
  }
  if (currency === "GBP") return `£${Math.round(min / 1000)}k–${Math.round(max / 1000)}k`;
  return `$${Math.round(min / 1000)}k–${Math.round(max / 1000)}k`;
}

// ---------- hooks -----------------------------------------------------------
export function useCountUp(value: number, duration = 800): number {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

// ---------- visual atoms ----------------------------------------------------
type Tone = "volt" | "mint" | "amber" | "rose" | "sky" | "mute";

const TONES: Record<Tone, string> = {
  volt: "text-volt border-volt/30 bg-volt/10",
  mint: "text-mint border-mint/30 bg-mint/10",
  amber: "text-ember border-ember/30 bg-ember/10",
  rose: "text-rose border-rose/30 bg-rose/10",
  sky: "text-sky border-sky/30 bg-sky/10",
  mute: "text-mist border-white/10 bg-white/5",
};

export function Badge({
  tone = "mute",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ScoreRing({
  score,
  size = 54,
  stroke = 5,
  showLabel = true,
}: {
  score: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#b6ff3c" : score >= 60 ? "#5eead4" : "#fbbf24";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-sm font-semibold" style={{ color }}>
            {score}
          </span>
        </div>
      )}
    </div>
  );
}

const AVATAR_GRADIENTS: [string, string][] = [
  ["#b6ff3c", "#0e5c3f"],
  ["#5eead4", "#0b3d4a"],
  ["#fbbf24", "#6b3410"],
  ["#7dd3fc", "#1e3a5f"],
  ["#d8b4fe", "#4a2359"],
  ["#fda4af", "#5f1e2e"],
];

export function CompanyAvatar({ name, size = 44 }: { name: string; size?: number }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 font-display font-bold text-ink"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: size * 0.34,
      }}
    >
      {initials}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  sub,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Icon className="h-6 w-6 text-mist" />
      </div>
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      <p className="max-w-sm font-mono text-xs leading-relaxed text-mist">{sub}</p>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  sub,
  actions,
}: {
  kicker: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-volt sm:mb-2 sm:text-[11px]">
          {kicker}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {sub && <p className="mt-2 max-w-xl text-xs leading-relaxed text-mist sm:text-sm">{sub}</p>}
      </div>
      {actions && <div className="w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
