"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import type { ApplicationDTO, JobDTO } from "@/lib/types";
import { isUserConfirmedSubmission } from "@/lib/application-status";

export function useApplyFlow(onPrepared?: (jobId: number) => void) {
  const [modalJob, setModalJob] = useState<JobDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApplicationDTO | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const triggerApply = async (job: JobDTO) => {
    setModalJob(job);
    setResult(null);
    setApplyError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not prepare application draft");
      if (!data.application) throw new Error("The server did not return an application draft");
      setResult(data.application as ApplicationDTO);
      onPrepared?.(job.id);
    } catch (error) {
      setApplyError(
        error instanceof Error ? error.message : "Could not prepare application draft"
      );
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalJob(null);
    setResult(null);
    setApplyError(null);
  };

  return { modalJob, loading, result, applyError, triggerApply, closeModal };
}

export default function ApplyModal({
  job,
  loading,
  result,
  applyError,
  onClose,
}: {
  job: JobDTO | null;
  loading: boolean;
  result: ApplicationDTO | null;
  applyError?: string | null;
  onClose: () => void;
}) {
  const [showResume, setShowResume] = useState(false);
  if (!job) return null;

  const applyUrl = (() => {
    try {
      const url = new URL(result?.portalUrl || job.url);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  })();
  const submitted = isUserConfirmedSubmission(result?.timeline);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="panel gradient-border max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-4 sm:p-7 animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-volt">
              application draft
            </p>
            <h3 className="mt-1 truncate font-display text-xl font-bold text-white sm:text-2xl">
              {job.title}
            </h3>
            <p className="truncate text-xs text-mist sm:text-sm">@ {job.company}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 p-2 text-mist transition-colors hover:text-white"
            aria-label="Close application draft"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-mist">
            <Loader2 className="h-4 w-4 animate-spin text-volt" />
            Preparing your draft from the resume you provided…
          </div>
        )}

        {applyError && (
          <div className="mt-5 rounded-xl border border-rose/35 bg-rose/10 p-4 text-sm text-rose">
            <p>{applyError}</p>
            {applyError.includes("resume") && (
              <Link
                href="/settings"
                onClick={onClose}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-volt px-4 py-2 font-display text-xs font-bold text-ink"
              >
                Add your resume <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        {result && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-volt/30 bg-volt/[0.07] p-4">
              <Badge tone={submitted ? "volt" : "amber"}>
                {submitted ? "Marked submitted" : "Draft ready"}
              </Badge>
              <p className="mt-3 text-sm leading-relaxed text-white">
                JobPulse has not submitted this application or contacted the employer. Review your
                resume, then submit it yourself on the employer&apos;s website.
              </p>
            </div>

            {result.matchedKeywords.length > 0 || result.gapKeywords.length > 0 ? (
              <div className="rounded-xl border border-white/[0.08] p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-mist">
                  Resume keyword comparison (not an ATS score)
                </p>
                <p className="mt-2 text-xs text-white/80">
                  {result.coverage}% of the tracked role keywords were found in your resume.
                </p>
                {result.matchedKeywords.length > 0 && (
                  <p className="mt-2 text-xs text-mint">
                    Found: {result.matchedKeywords.join(", ")}
                  </p>
                )}
                {result.gapKeywords.length > 0 && (
                  <p className="mt-2 text-xs text-ember">
                    Not found: {result.gapKeywords.join(", ")}
                  </p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowResume((shown) => !shown)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white hover:border-volt/50"
            >
              <FileText className="h-4 w-4" />
              {showResume ? "Hide resume" : "Review resume"}
            </button>
            {showResume && (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-black/30 p-4 font-mono text-xs leading-relaxed text-white/85">
                {result.tailoredResume}
              </pre>
            )}

            <div className="flex flex-wrap gap-3 border-t border-white/[0.07] pt-4">
              {applyUrl && (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg bg-volt px-4 py-2.5 font-display text-sm font-bold text-ink",
                    "transition-shadow hover:shadow-[0_0_24px_rgba(182,255,60,0.35)]"
                  )}
                >
                  Open employer website <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white hover:border-white/30"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
