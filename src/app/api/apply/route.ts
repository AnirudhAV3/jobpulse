import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, resumes } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { atsSuite, skillById, skillPresent } from "@/lib/ats";
import { toApplicationDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { jobId?: number };
    const jobId = Number(body.jobId);
    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      return NextResponse.json({ error: "A valid jobId is required" }, { status: 400 });
    }

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)))
      .limit(1);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.status === "archived") {
      return NextResponse.json({ error: "Job is archived" }, { status: 409 });
    }

    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.jobId, jobId), eq(applications.userId, user.id)))
      .limit(1);
    if (existing) {
      return NextResponse.json({
        application: toApplicationDTO(existing, job),
        already: true,
      });
    }

    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .limit(1);
    if (!resume || resume.content.trim().length < 50) {
      return NextResponse.json(
        { error: "Add your resume in Settings before preparing an application draft." },
        { status: 400 }
      );
    }

    const requiredSkills = (job.keywords ?? [])
      .map((id) => skillById(id))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));
    const matchedKeywords = requiredSkills
      .filter((skill) => skillPresent(resume.content, skill))
      .map((skill) => skill.label);
    const gapKeywords = requiredSkills
      .filter((skill) => !skillPresent(resume.content, skill))
      .map((skill) => skill.label);
    const coverage = requiredSkills.length
      ? Math.round((matchedKeywords.length / requiredSkills.length) * 100)
      : 0;
    const atsBreakdown = atsSuite(resume.content, job.keywords ?? [], [job.title]);
    const atsScore = Math.round(
      atsBreakdown.reduce((total, profile) => total + profile.score, 0) / atsBreakdown.length
    );
    const now = new Date();
    const [application] = await db
      .insert(applications)
      .values({
        userId: user.id,
        jobId,
        status: "draft",
        atsScore,
        aiEngine: "builtin",
        coverage,
        atsBreakdown,
        matchedKeywords,
        gapKeywords,
        tailoredResume: resume.content,
        authMethod: "manual",
        gmailAccount: "",
        filledFields: {},
        missingFields: [],
        portalUrl: job.url,
        timeline: [
          {
            status: "draft",
            label: "Draft prepared. Review your resume and submit directly on the employer website.",
            at: now.toISOString(),
          },
        ],
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: applications.jobId })
      .returning();

    if (!application) {
      const [createdByConcurrentRequest] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.jobId, jobId), eq(applications.userId, user.id)))
        .limit(1);
      if (!createdByConcurrentRequest) {
        throw new Error("Application draft could not be created");
      }
      return NextResponse.json({
        application: toApplicationDTO(createdByConcurrentRequest, job),
        already: true,
      });
    }

    return NextResponse.json({
      application: toApplicationDTO(application, job),
      already: false,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/apply POST]", err);
    return NextResponse.json({ error: "Failed to prepare application draft" }, { status: 500 });
  }
}
