import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, emails, jobs } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toEmailDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({ email: emails, app: applications, job: jobs })
      .from(emails)
      .leftJoin(applications, eq(emails.applicationId, applications.id))
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(eq(emails.userId, user.id), eq(emails.source, "imap")))
      .orderBy(desc(emails.receivedAt))
      .limit(200);

    return NextResponse.json({
      emails: rows.map((r) => toEmailDTO(r.email, r.job?.title ?? null)),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/inbox GET]", err);
    return NextResponse.json({ error: "Failed to load inbox" }, { status: 500 });
  }
}
