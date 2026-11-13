import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, emails, jobs, scrapeRuns } from "@/db/schema";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import type { ActivityItem, StatsDTO } from "@/lib/types";
import { isUserConfirmedSubmission } from "@/lib/application-status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();

    const [
      jobsScrapedRow,
      jobsMatchedRow,
      interestedRow,
      applicationRows,
      responsesRow,
      assessmentsRow,
      interviewsRow,
      attendedRow,
      unreadRow,
      runsRow,
    ] = await Promise.all([
      db.select({ value: count() }).from(jobs).where(eq(jobs.userId, user.id)),
      db
        .select({ value: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, user.id),
            eq(jobs.matched, true),
            ne(jobs.status, "archived")
          )
        ),
      db
        .select({ value: count() })
        .from(jobs)
        .where(and(eq(jobs.userId, user.id), eq(jobs.status, "interested"))),
      db
        .select({ status: applications.status, timeline: applications.timeline })
        .from(applications)
        .where(eq(applications.userId, user.id)),
      db
        .select({ value: count() })
        .from(emails)
        .where(
          and(
            eq(emails.userId, user.id),
            eq(emails.source, "imap"),
            ne(emails.type, "verification")
          )
        ),
      db
        .select({ value: count() })
        .from(emails)
        .where(
          and(
            eq(emails.userId, user.id),
            eq(emails.source, "imap"),
            eq(emails.type, "assessment")
          )
        ),
      db
        .select({ value: count() })
        .from(emails)
        .where(
          and(
            eq(emails.userId, user.id),
            eq(emails.source, "imap"),
            eq(emails.type, "interview")
          )
        ),
      db
        .select({ value: count() })
        .from(emails)
        .where(
          and(
            eq(emails.userId, user.id),
            eq(emails.source, "imap"),
            eq(emails.attended, true)
          )
        ),
      db
        .select({ value: count() })
        .from(emails)
        .where(
          and(
            eq(emails.userId, user.id),
            eq(emails.source, "imap"),
            eq(emails.read, false)
          )
        ),
      db
        .select({ value: count() })
        .from(scrapeRuns)
        .where(and(eq(scrapeRuns.userId, user.id), eq(scrapeRuns.status, "success"))),
    ]);

    const [lastRun] = await db
      .select()
      .from(scrapeRuns)
      .where(and(eq(scrapeRuns.userId, user.id), eq(scrapeRuns.status, "success")))
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(1);

    const recentJobs = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, user.id), ne(jobs.status, "archived")))
      .orderBy(desc(jobs.createdAt))
      .limit(4);

    const recentApps = await db
      .select({ app: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.updatedAt))
      .limit(4);

    const recentEmails = await db
      .select()
      .from(emails)
      .where(and(eq(emails.userId, user.id), eq(emails.source, "imap")))
      .orderBy(desc(emails.receivedAt))
      .limit(4);

    const activity: ActivityItem[] = [
      ...recentJobs.map<ActivityItem>((j) => ({
        id: `job-${j.id}`,
        kind: "job",
        text: `${j.matched ? "Matched role" : "Tracked role"} — ${j.title} @ ${j.company}`,
        at: j.createdAt.toISOString(),
      })),
      ...recentApps.map<ActivityItem>((r) => ({
        id: `app-${r.app.id}-${r.app.status}`,
        kind: "application",
        text: isUserConfirmedSubmission(r.app.timeline)
          ? `Marked submitted by you — ${r.job.title} @ ${r.job.company}`
          : r.app.status === "applied"
            ? `Legacy application record needs review — ${r.job.title} @ ${r.job.company}`
            : `Application draft prepared — ${r.job.title} @ ${r.job.company}`,
        at: r.app.updatedAt.toISOString(),
      })),
      ...recentEmails.map<ActivityItem>((e) => ({
        id: `email-${e.id}`,
        kind: "email",
        text: `${
          e.type === "verification"
            ? "Portal verification OTP/link"
            : e.type === "assessment"
              ? "Assessment invite"
              : e.type === "interview"
                ? "Interview invite"
                : e.type === "rejection"
                  ? "Response (closed)"
                  : e.type === "offer"
                    ? "Offer movement"
                    : "Company replied"
        } — ${e.company}`,
        at: e.receivedAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 9);

    const payload: StatsDTO = {
      jobsScraped: jobsScrapedRow[0]?.value ?? 0,
      jobsMatched: jobsMatchedRow[0]?.value ?? 0,
      interested: interestedRow[0]?.value ?? 0,
      applied: applicationRows.filter(
        (application) =>
          application.status === "applied" && isUserConfirmedSubmission(application.timeline)
      ).length,
      responses: responsesRow[0]?.value ?? 0,
      assessments: assessmentsRow[0]?.value ?? 0,
      interviews: interviewsRow[0]?.value ?? 0,
      attended: attendedRow[0]?.value ?? 0,
      unread: unreadRow[0]?.value ?? 0,
      runs: runsRow[0]?.value ?? 0,
      lastRunAt: lastRun ? lastRun.startedAt.toISOString() : null,
      lastFound: lastRun?.jobsFound ?? 0,
      lastNew: lastRun?.jobsNew ?? 0,
      recent: activity,
    };

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/stats]", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
