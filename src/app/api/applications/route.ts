import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toApplicationDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({ app: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.createdAt));
    return NextResponse.json({
      applications: rows.map((r) => toApplicationDTO(r.app, r.job)),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/applications GET]", err);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}
