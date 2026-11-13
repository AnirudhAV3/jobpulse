import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toApplicationDTO } from "@/lib/mapper";
import { isUserConfirmedSubmission } from "@/lib/application-status";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const applicationId = Number(id);
    if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
      return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
    }

    const body = (await req.json()) as { submitted?: boolean };
    if (body.submitted !== true) {
      return NextResponse.json(
        { error: "Confirm that you submitted the application on the employer website." },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, user.id)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, existing.jobId), eq(jobs.userId, user.id)))
      .limit(1);
    if (!job) return NextResponse.json({ error: "Associated job not found" }, { status: 404 });

    if (!isUserConfirmedSubmission(existing.timeline)) {
      const now = new Date();
      const updated = await db.transaction(async (tx) => {
        const [application] = await tx
          .update(applications)
          .set({
            status: "applied",
            appliedAt: now,
            updatedAt: now,
            timeline: [
              ...(existing.timeline ?? []),
              {
                status: "applied",
                label: "Marked submitted by you after submitting on the employer website.",
                at: now.toISOString(),
              },
            ],
          })
          .where(and(eq(applications.id, applicationId), eq(applications.userId, user.id)))
          .returning();

        await tx
          .update(jobs)
          .set({ status: "applied" })
          .where(and(eq(jobs.id, job.id), eq(jobs.userId, user.id)));
        return application;
      });

      return NextResponse.json({ application: toApplicationDTO(updated, job) });
    }

    return NextResponse.json({ application: toApplicationDTO(existing, job) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/applications PATCH]", err);
    return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
  }
}
