import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toJobDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? "new";
    const q = sp.get("q")?.trim();
    const matchedOnly = sp.get("matched") === "1";
    const workplace = sp.get("workplace");

    const conditions: SQL[] = [eq(jobs.userId, user.id)];
    if (status !== "all") conditions.push(eq(jobs.status, status));
    if (matchedOnly) conditions.push(eq(jobs.matched, true));
    if (workplace && workplace !== "any") conditions.push(eq(jobs.workplace, workplace));
    if (q) {
      const like = `%${q}%`;
      const clause = or(
        ilike(jobs.title, like),
        ilike(jobs.company, like),
        ilike(jobs.location, like)
      );
      if (clause) conditions.push(clause);
    }

    const rows = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.matched), desc(jobs.matchScore), desc(jobs.createdAt))
      .limit(300);

    return NextResponse.json({ jobs: rows.map(toJobDTO) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/jobs GET]", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
