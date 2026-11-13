import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, resumes } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { matchScore } from "@/lib/ats";

export const dynamic = "force-dynamic";

async function getOrCreateUserResume(userId: number) {
  const rows = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .limit(1);
  if (rows.length) return rows[0];
  const [row] = await db
    .insert(resumes)
    .values({ userId, name: "My Base Resume", content: "" })
    .returning();
  return row;
}

export async function GET() {
  try {
    const user = await requireUser();
    const row = await getOrCreateUserResume(user.id);
    return NextResponse.json({
      resume: {
        id: row.id,
        name: row.name,
        content: row.content,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/resume GET]", err);
    return NextResponse.json({ error: "Failed to load resume" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { content?: string };
    const content = body.content?.trim();

    if (!content || content.length < 60) {
      return NextResponse.json(
        { error: "Resume content is too short (enter at least 60 characters)." },
        { status: 400 }
      );
    }

    const existing = await getOrCreateUserResume(user.id);
    const [saved] = await db
      .update(resumes)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(resumes.id, existing.id), eq(resumes.userId, user.id)))
      .returning();

    const openJobs = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, user.id), ne(jobs.status, "applied")));
    for (const j of openJobs) {
      const score = matchScore(content, j.keywords ?? []);
      await db
        .update(jobs)
        .set({ matchScore: score, matched: score >= 52 })
        .where(and(eq(jobs.id, j.id), eq(jobs.userId, user.id)));
    }

    const row = saved ?? existing;
    return NextResponse.json({
      resume: {
        id: row.id,
        name: row.name,
        content: row.content,
        updatedAt: row.updatedAt.toISOString(),
      },
      rescored: openJobs.length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/resume PUT]", err);
    return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
  }
}
