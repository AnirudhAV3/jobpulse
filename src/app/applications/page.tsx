"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import {
  Badge,
  CompanyAvatar,
  EmptyState,
  PageHeader,
  cn,
  timeAgo,
} from "@/components/ui";
import type { ApplicationDTO } from "@/lib/types";
import { isUserConfirmedSubmission } from "@/lib/application-status";

export default function ApplicationsPage() {
  const [apps, setApps] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/applications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load applications");
      setApps(data.applications ?? []);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const markSubmitted = async (app: ApplicationDTO) => {
    setBusyId(app.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submitted: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update application");
      setApps((items) =>
        items.map((item) => (item.id === app.id ? data.application : item))
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update application");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="application tracker"
        title="Applications"
        sub="Review prepared drafts, open the employer website to submit, then mark the application submitted here. JobPulse does not sign in to employer portals or submit applications for you."
        actions={
          apps.length > 0 ? (
            <Badge tone="mute" className="px-3 py-1.5 text-[11px]">
              {apps.filter((app) => app.status === "applied").length} marked submitted
            </Badge>
          ) : undefined
        }
      />

      {actionError && (
        <p role="alert" className="mb-4 rounded-lg border border-rose/30 bg-rose/10 p-3 text-sm text-rose">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="panel shimmer h-40" />
          <div className="panel shimmer h-40" />
        </div>
      ) : loadError ? (
        <div role="alert" className="panel p-5 text-sm text-rose">{loadError}</div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No application drafts yet"
          sub="Prepare a draft from a role in Jobs Feed or Interested Roles. You will submit it directly on the employer website."
        />
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            let employerUrl: string | null = null;
            try {
              const url = new URL(app.portalUrl);
              if (url.protocol === "https:" || url.protocol === "http:") {
                employerUrl = url.toString();
              }
            } catch {
              employerUrl = null;
            }

            const submitted = isUserConfirmedSubmission(app.timeline);
            const legacySubmittedStatus = app.status === "applied" && !submitted;
            return (
              <article key={app.id} className="panel p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <CompanyAvatar name={app.job?.company ?? "?"} size={44} />
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-base font-semibold text-white sm:text-lg">
                        {app.job?.title ?? "Unknown role"}
                      </h2>
                      <p className="truncate text-sm text-mist">
                        {app.job?.company} · {app.job?.location}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={submitted ? "mint" : "amber"}>
                          {submitted
                            ? "marked submitted"
                            : legacySubmittedStatus
                              ? "legacy status — unverified"
                              : "draft"}
                        </Badge>
                        <span className="font-mono text-[10px] text-mist">
                          prepared {timeAgo(app.createdAt)}
                          {submitted && app.appliedAt
                            ? ` · marked submitted ${timeAgo(app.appliedAt)}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {employerUrl && (
                      <a
                        href={employerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:border-volt/50 hover:text-volt"
                      >
                        Open employer site <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {!submitted && (
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() => void markSubmitted(app)}
                        className="inline-flex items-center gap-2 rounded-lg bg-volt px-3 py-2 text-xs font-bold text-ink disabled:opacity-50"
                      >
                        {busyId === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        I submitted this
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-mist">
                  {submitted
                    ? "You marked this as submitted. JobPulse has not independently verified submission."
                    : legacySubmittedStatus
                      ? "This record was created by an older version that could mark applications as submitted without contacting the employer. Verify it directly with the employer before treating it as submitted."
                    : "This is a draft only. Review it and complete the application on the employer website."}
                </p>

                {(app.matchedKeywords.length > 0 || app.gapKeywords.length > 0) && (
                  <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-3 text-xs">
                    <p className="font-mono uppercase tracking-widest text-mist">
                      Resume keyword comparison · {app.coverage}% match
                    </p>
                    {app.matchedKeywords.length > 0 && (
                      <p className="mt-2 text-mint">
                        Found: {app.matchedKeywords.join(", ")}
                      </p>
                    )}
                    {app.gapKeywords.length > 0 && (
                      <p className="mt-2 text-ember">
                        Not found: {app.gapKeywords.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  className={cn(
                    "mt-3 inline-flex items-center gap-2 text-xs text-mist hover:text-white",
                    expandedId === app.id && "text-volt"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {expandedId === app.id ? "Hide resume" : "Review resume"}
                </button>
                {expandedId === app.id && (
                  <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-white/[0.07] bg-black/30 p-4 font-mono text-xs leading-relaxed text-white/85">
                    {app.tailoredResume}
                  </pre>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
