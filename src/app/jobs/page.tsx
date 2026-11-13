"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Radar, SlidersHorizontal } from "lucide-react";
import JobCard from "@/components/job-card";
import ApplyModal, { useApplyFlow } from "@/components/apply-modal";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import type { JobDTO } from "@/lib/types";

export default function JobsPage() {
  const [jobsList, setJobsList] = useState<JobDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [matchedOnly, setMatchedOnly] = useState(false);
  const [workplace, setWorkplace] = useState("any");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const {
    modalJob,
    loading: preparing,
    result,
    applyError,
    triggerApply,
    closeModal,
  } = useApplyFlow((jobId) => {
    setRemoved((r) => new Set(r).add(jobId));
  });

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const sp = new URLSearchParams({ status: "new" });
      if (q.trim()) sp.set("q", q.trim());
      if (matchedOnly) sp.set("matched", "1");
      if (workplace !== "any") sp.set("workplace", workplace);
      try {
        const res = await fetch(`/api/jobs?${sp.toString()}`, { cache: "no-store" });
        const data = await res.json();
        setJobsList(data.jobs ?? []);
      } finally {
        setLoading(false);
      }
    },
    [q, matchedOnly, workplace]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(true), 20_000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (id: number, action: "interested" | "archive") => {
    setBusyId(id);
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setRemoved((r) => new Set(r).add(id));
    } finally {
      setBusyId(null);
    }
  };

  const visible = jobsList.filter((j) => !removed.has(j.id));

  return (
    <div>
      <PageHeader
        kicker="job feed"
        title="Jobs Feed"
        sub="Review available roles, compare their tracked keywords with your resume, and prepare a draft. You submit applications yourself on each employer website."
        actions={
          <Badge tone="volt" className="px-3 py-1.5 text-[11px]">
            {visible.length} open roles tracked
          </Badge>
        }
      />

      {/* filters */}
      <div className="panel mb-6 flex flex-col gap-3 p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1 sm:min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, company, location…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-mist/50 focus:border-volt/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-mist" />
          <select
            value={workplace}
            onChange={(e) => setWorkplace(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-volt/50 focus:outline-none"
          >
            <option value="any">Any workplace</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>
        <button
          onClick={() => setMatchedOnly((m) => !m)}
          className={
            matchedOnly
              ? "rounded-lg border border-volt/50 bg-volt/15 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-volt"
              : "rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-mist hover:text-white"
          }
        >
          resume matches only
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel shimmer h-56" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="No roles in the feed"
          sub="No matching roles are available yet. Check your preferred role and location filters, and confirm the employer feeds and scheduled scraping are configured."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              variant="feed"
              busy={busyId === job.id}
              onApply={(j) => void triggerApply(j)}
              onInterested={(id) => void act(id, "interested")}
              onArchive={(id) => void act(id, "archive")}
            />
          ))}
        </div>
      )}

      <ApplyModal
        job={modalJob}
        loading={preparing}
        result={result}
        applyError={applyError}
        onClose={closeModal}
      />
    </div>
  );
}
