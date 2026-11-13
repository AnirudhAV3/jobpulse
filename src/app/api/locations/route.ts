import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, preferredLocations } from "@/db/schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toLocationDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

async function listLocations(userId: number) {
  const rows = await db
    .select()
    .from(preferredLocations)
    .where(eq(preferredLocations.userId, userId))
    .orderBy(desc(preferredLocations.createdAt));
  return rows.map(toLocationDTO);
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ locations: await listLocations(user.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/locations GET]", err);
    return NextResponse.json({ error: "Failed to load locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { name?: string };
    const name = body.name?.replace(/\s+/g, " ").trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Location name required" }, { status: 400 });
    }
    if (name.length > 60) {
      return NextResponse.json({ error: "Location name too long" }, { status: 400 });
    }
    await db
      .insert(preferredLocations)
      .values({ userId: user.id, name })
      .onConflictDoNothing({
        target: [preferredLocations.userId, preferredLocations.name],
      });

    const prefs = (
      await db
        .select()
        .from(preferredLocations)
        .where(eq(preferredLocations.userId, user.id))
    ).map((p) => p.name.toLowerCase().trim());

    let purged = 0;
    if (prefs.length) {
      const candidates = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, user.id), ne(jobs.status, "applied")));
      const toArchive = candidates
        .filter((j) => {
          const loc = j.location.toLowerCase();
          return !prefs.some((p) => loc.includes(p) || p.includes(loc));
        })
        .map((j) => j.id);
      purged = toArchive.length;
      if (toArchive.length) {
        await db
          .update(jobs)
          .set({ status: "archived" })
          .where(and(eq(jobs.userId, user.id), inArray(jobs.id, toArchive)));
      }
    }

    return NextResponse.json({
      locations: await listLocations(user.id),
      purged,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/locations POST]", err);
    return NextResponse.json({ error: "Failed to add location" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await db
      .delete(preferredLocations)
      .where(and(eq(preferredLocations.id, id), eq(preferredLocations.userId, user.id)));
    return NextResponse.json({ locations: await listLocations(user.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/locations DELETE]", err);
    return NextResponse.json({ error: "Failed to remove location" }, { status: 500 });
  }
}
