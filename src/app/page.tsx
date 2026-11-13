"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Heart,
  Inbox,
  MailOpen,
  Radar,
  Send,
  Video,
} from "lucide-react";
import { Badge, PageHeader, timeAgo, useCountUp } from "@/components/ui";
import type { SchedulerDTO, StatsDTO } from "@/lib/types";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Radar;
  label: string;
  value: number;
}) {
  const count = useCountUp(value);
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-volt" />
        <span className="font-mono text-2xl font-bold text-white">{count}</span>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-mist">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statsResponse, schedulerResponse] = await Promise.all([
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/scheduler", { cache: "no-store" }),
      ]);
      if (!statsResponse.ok || !schedulerResponse.ok) {
        throw new Error("Could not load your dashboard data.");
      }
      const [statsData, schedulerData] = await Promise.all([
        statsResponse.json(),
        schedulerResponse.json(),
      ]);
      setStats(statsData);
      setScheduler(schedulerData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 30_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [load]);

  const cards = [
    { icon: Briefcase, label: "Tracked roles", value: stats?.jobsScraped ?? 0 },
    { icon: Radar, label: "Resume keyword matches", value: stats?.jobsMatched ?? 0 },
    { icon: Heart, label: "Interested", value: stats?.interested ?? 0 },
    { icon: Send, label: "Marked submitted", value: stats?.applied ?? 0 },
    { icon: MailOpen, label: "Inbox responses", value: stats?.responses ?? 0 },
    { icon: ClipboardList, label: "Assessments", value: stats?.assessments ?? 0 },
    { icon: Video, label: "Interview messages", value: stats?.interviews ?? 0 },
    { icon: CheckCircle2, label: "Marked attended", value: stats?.attended ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        kicker="personal job workspace"
        title="Command Center"
        sub="Track roles, prepare application drafts, and review messages imported from a mailbox you choose to connect."
      />

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-rose/30 bg-rose/10 p-4 text-sm text-rose">
          {error}
        </div>
      )}

      <section
        aria-labelledby="scraper-status"
        className="panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="scraper-status" className="font-display font-semibold text-white">
              Job collection
            </h2>
            <Badge tone={scheduler?.configured ? "mint" : "amber"}>
              {scheduler?.configured ? "feeds configured" : "feed setup required"}
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mist">
            Greenhouse and Lever feeds run from GitHub Actions every five minutes for accounts with
            scheduled scraping enabled. Runs are best-effort and may be delayed by GitHub.
          </p>
          {scheduler?.lastRunAt && (
            <p className="mt-2 font-mono text-[10px] text-mist">
              Last worker run recorded {timeAgo(scheduler.lastRunAt)}
            </p>
          )}
        </div>
        <Link
          href="/jobs"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:border-volt/50 hover:text-volt"
        >
          View tracked roles
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="panel p-4 sm:p-6 lg:col-span-3" aria-labelledby="activity-title">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-volt" />
            <h2 id="activity-title" className="font-display text-lg font-semibold text-white">
              Recent activity
            </h2>
          </div>
          {stats?.recent.length ? (
            <ul className="space-y-1">
              {stats.recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]"
                >
                  {item.kind === "email" ? (
                    <Inbox className="h-3.5 w-3.5 shrink-0 text-ember" />
                  ) : item.kind === "application" ? (
                    <Send className="h-3.5 w-3.5 shrink-0 text-sky" />
                  ) : (
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-mint" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">{item.text}</span>
                  <time className="shrink-0 font-mono text-[10px] text-mist">
                    {timeAgo(item.at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-mist">
              No activity yet. Start by adding your resume and reviewing available roles.
            </p>
          )}
        </section>

        <section className="panel p-4 sm:p-6 lg:col-span-2" aria-labelledby="getting-started">
          <h2 id="getting-started" className="font-display text-lg font-semibold text-white">
            Get started
          </h2>
          <ol className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="font-mono text-volt">01</span>
              <Link href="/settings" className="text-white hover:text-volt">
                Add your resume and choose optional AI settings.
              </Link>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-volt">02</span>
              <Link href="/jobs" className="text-white hover:text-volt">
                Review available roles and prepare drafts.
              </Link>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-volt">03</span>
              <Link href="/applications" className="text-white hover:text-volt">
                Submit drafts yourself on employer websites.
              </Link>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-volt">04</span>
              <Link href="/inbox" className="text-white hover:text-volt">
                Optionally connect a supported mailbox to import recruiter messages.
              </Link>
            </li>
          </ol>
          <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-mist">
            Notifications are optional and require your explicit permission on each device. JobPulse
            never requests browser permissions automatically at login.
          </p>
        </section>
      </div>
    </div>
  );
}
