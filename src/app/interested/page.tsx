"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import JobCard from "@/components/job-card";
import ApplyModal, { useApplyFlow } from "@/components/apply-modal";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import type { JobDTO } from "@/lib/types";

export default function InterestedPage() {
  const [list, setList] = useState<JobDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const {
    modalJob,
    loading: preparing,
    result,
    applyError,
    triggerApply,
    closeModal,
  } = useApplyFlow((jobId) => {
    setList((l) => l.filter((j) => j.id !== jobId));
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/jobs?status=interested", { cache: "no-store" });
      const data = await res.json();
      setList(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(true), 20_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [load]);

  const moveBack = async (id: number) => {
    setBusyId(id);
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      setList((l) => l.filter((j) => j.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="shortlist"
        title="Interested Roles"
        sub="Prepare a draft for a shortlisted role, review your resume and keyword comparison, then submit directly on the employer website."
        actions={
          <Badge tone="volt" className="px-3 py-1.5 text-[11px]">
            {list.length} shortlisted
          </Badge>
        }
      />

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="panel shimmer h-56" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing shortlisted yet"
          sub="Mark roles as Interested in the Jobs Feed — shortlisted roles land here."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              variant="interested"
              busy={busyId === job.id}
              onRemove={moveBack}
              onApply={(j) => void triggerApply(j)}
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
