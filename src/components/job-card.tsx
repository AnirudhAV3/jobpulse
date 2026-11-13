"use client";

import { useState } from "react";
import {
  MapPin,
  Briefcase,
  Clock,
  Globe,
  ExternalLink,
  Heart,
  EyeOff,
  ChevronDown,
  Undo2,
  Sparkles,
} from "lucide-react";
import type { JobDTO } from "@/lib/types";
import { skillLabel } from "@/lib/ats";
import {
  Badge,
  CompanyAvatar,
  ScoreRing,
  cn,
  formatSalary,
  timeAgo,
} from "@/components/ui";

export function PostedChip({ iso }: { iso: string }) {
  return (
    <span
      title={`Posted ${new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`}
      className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-mint"
    >
      <Clock className="h-3 w-3" /> Posted {timeAgo(iso)}
    </span>
  );
}

export default function JobCard({
  job,
  variant,
  busy,
  onInterested,
  onArchive,
  onRemove,
  onApply,
}: {
  job: JobDTO;
  variant: "feed" | "interested";
  busy?: boolean;
  onInterested?: (id: number) => void;
  onArchive?: (id: number) => void;
  onRemove?: (id: number) => void;
  onApply?: (job: JobDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const chips = job.keywords.slice(0, 5).map(skillLabel);

  return (
    <article
      className={cn(
        "panel panel-hover relative overflow-hidden p-4 sm:p-5 animate-fade-up",
        job.matched && "gradient-border"
      )}
    >
      {job.matched && (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-volt/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-volt">
          resume match
        </div>
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        <CompanyAvatar name={job.company} size={42} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold leading-tight text-white">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-mist">{job.company}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PostedChip iso={job.postedAt} />
            <span
              title={`Career portal: ${job.portal}`}
              className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-sky/30 bg-sky/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky"
            >
              <Globe className="h-3 w-3" /> {job.source}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-mist">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-volt/70" /> {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-volt/70" /> {job.workplace} · {job.experience}
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/80">
              {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ScoreRing score={job.matchScore} />
          <span className="font-mono text-[8px] uppercase tracking-widest text-mist">match</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Badge key={c} tone="mute">
            {c}
          </Badge>
        ))}
        {job.keywords.length > 5 && (
          <Badge tone="mute">+{job.keywords.length - 5} more</Badge>
        )}
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-mist transition-colors hover:text-white"
      >
        <span>{open ? "Hide job description" : "Read job description"}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30 p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-mist">
            {job.description}
          </pre>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-volt hover:underline"
            >
              Open {job.portal} <ExternalLink className="h-3 w-3" />
            </a>
            <span className="font-mono text-[10px] text-mist/60">
              added {timeAgo(job.createdAt)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {variant === "feed" && (
          <>
            <button
              disabled={busy}
              onClick={() => onApply?.(job)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-volt px-4 py-2.5 font-display text-sm font-bold text-ink transition-all hover:shadow-[0_0_24px_rgba(182,255,60,0.4)] disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.5} /> Prepare draft
            </button>
            <button
              disabled={busy}
              onClick={() => onInterested?.(job.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-volt/35 bg-volt/10 px-3.5 py-2.5 font-display text-sm font-semibold text-volt transition-colors hover:bg-volt/20 disabled:opacity-40"
            >
              <Heart className="h-4 w-4" strokeWidth={2.2} /> Interested
            </button>
            <button
              disabled={busy}
              onClick={() => onArchive?.(job.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-mist transition-colors hover:border-rose/40 hover:text-rose disabled:opacity-40"
            >
              <EyeOff className="h-4 w-4" /> Skip
            </button>
          </>
        )}
        {variant === "interested" && (
          <>
            <button
              disabled={busy}
              onClick={() => onApply?.(job)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-volt px-4 py-2.5 font-display text-sm font-bold text-ink transition-all hover:shadow-[0_0_24px_rgba(182,255,60,0.4)] disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.5} /> Prepare application draft
            </button>
            <button
              disabled={busy}
              onClick={() => onRemove?.(job.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-mist transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" /> Move back
            </button>
          </>
        )}
      </div>
    </article>
  );
}
