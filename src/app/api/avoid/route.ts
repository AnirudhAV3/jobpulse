import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { avoidCompanies, jobs } from "@/db/schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toAvoidDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(avoidCompanies)
      .where(eq(avoidCompanies.userId, user.id))
      .orderBy(desc(avoidCompanies.createdAt));
    return NextResponse.json({ avoid: rows.map(toAvoidDTO) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/avoid GET]", err);
    return NextResponse.json({ error: "Failed to load avoid list" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Company name required" }, { status: 400 });

    await db
      .insert(avoidCompanies)
      .values({ userId: user.id, name })
      .onConflictDoNothing({ target: [avoidCompanies.userId, avoidCompanies.name] });

    const lower = name.toLowerCase();
    const candidates = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, user.id), ne(jobs.status, "applied")));
    const toArchive = candidates
      .filter(
        (j) =>
          j.company.toLowerCase().includes(lower) || lower.includes(j.company.toLowerCase())
      )
      .map((j) => j.id);
    if (toArchive.length) {
      await db
        .update(jobs)
        .set({ status: "archived" })
        .where(and(eq(jobs.userId, user.id), inArray(jobs.id, toArchive)));
    }

    const rows = await db
      .select()
      .from(avoidCompanies)
      .where(eq(avoidCompanies.userId, user.id))
      .orderBy(desc(avoidCompanies.createdAt));
    return NextResponse.json({ avoid: rows.map(toAvoidDTO), archived: toArchive.length });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/avoid POST]", err);
    return NextResponse.json({ error: "Failed to add company" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await db
      .delete(avoidCompanies)
      .where(and(eq(avoidCompanies.id, id), eq(avoidCompanies.userId, user.id)));
    const rows = await db
      .select()
      .from(avoidCompanies)
      .where(eq(avoidCompanies.userId, user.id))
      .orderBy(desc(avoidCompanies.createdAt));
    return NextResponse.json({ avoid: rows.map(toAvoidDTO) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/avoid DELETE]", err);
    return NextResponse.json({ error: "Failed to remove company" }, { status: 500 });
  }
}
