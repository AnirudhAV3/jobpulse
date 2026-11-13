import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { jobs, targetRoles } from "@/db/schema";
import { DEFAULT_TARGET_ROLE, requireUser, UnauthorizedError } from "@/lib/auth";
import {
  expandedHeadingNamesForRole,
  isBaUmbrellaRole,
  jobMatchesTargetRoles,
} from "@/lib/engine";
import { toTargetRoleDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

async function listRolesForUser(userId: number) {
  const rows = await db
    .select()
    .from(targetRoles)
    .where(eq(targetRoles.userId, userId))
    .orderBy(desc(targetRoles.createdAt));

  return rows.map((r) => toTargetRoleDTO(r, expandedHeadingNamesForRole(r.name)));
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ roles: await listRolesForUser(user.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/roles GET]", err);
    return NextResponse.json({ error: "Failed to load target roles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { name?: string };
    const raw = body.name?.replace(/\s+/g, " ").trim() ?? "";
    if (!raw || raw.length < 2) {
      return NextResponse.json({ error: "Enter a target job role" }, { status: 400 });
    }
    if (raw.length > 70) {
      return NextResponse.json({ error: "Role name is too long" }, { status: 400 });
    }

    const normalizedName = isBaUmbrellaRole(raw) ? DEFAULT_TARGET_ROLE : raw;

    await db
      .insert(targetRoles)
      .values({ userId: user.id, name: normalizedName })
      .onConflictDoNothing({ target: [targetRoles.userId, targetRoles.name] });

    // Archive unapplied jobs that don't match the user's active target role(s)
    const activeRoles = (
      await db.select().from(targetRoles).where(eq(targetRoles.userId, user.id))
    ).map((r) => r.name);

    let purged = 0;
    if (activeRoles.length > 0) {
      const candidates = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, user.id), ne(jobs.status, "applied"), ne(jobs.status, "archived")));

      const toArchive = candidates
        .filter((j) => !jobMatchesTargetRoles(j.title, activeRoles))
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
      roles: await listRolesForUser(user.id),
      purged,
      scrapedNew: 0,
      message: "Target role saved. Configure a real job source before scraping.",
      expandedHeadings: expandedHeadingNamesForRole(normalizedName),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/roles POST]", err);
    return NextResponse.json({ error: "Failed to add target role" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await db
      .delete(targetRoles)
      .where(and(eq(targetRoles.id, id), eq(targetRoles.userId, user.id)));

    return NextResponse.json({ roles: await listRolesForUser(user.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/roles DELETE]", err);
    return NextResponse.json({ error: "Failed to remove target role" }, { status: 500 });
  }
}
