import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toJobDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

type Action = "interested" | "archive" | "restore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const jobId = Number(id);
    if (!Number.isFinite(jobId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = (await req.json()) as { action?: Action };
    const action = body.action;

    const statusMap: Record<Action, string> = {
      interested: "interested",
      archive: "archived",
      restore: "new",
    };
    if (!action || !(action in statusMap)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status === "applied" && action !== "archive") {
      return NextResponse.json({ error: "Already applied" }, { status: 409 });
    }

    const [updated] = await db
      .update(jobs)
      .set({ status: statusMap[action] })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)))
      .returning();

    return NextResponse.json({ job: toJobDTO(updated) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/jobs PATCH]", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}
