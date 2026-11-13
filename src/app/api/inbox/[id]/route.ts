import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emails } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { toEmailDTO } from "@/lib/mapper";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const emailId = Number(id);
    if (!Number.isFinite(emailId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = (await req.json()) as { read?: boolean; attended?: boolean };
    const updates: Partial<{ read: boolean; attended: boolean }> = {};
    if (typeof body.read === "boolean") updates.read = body.read;
    if (typeof body.attended === "boolean") updates.attended = body.attended;
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const [updated] = await db
      .update(emails)
      .set(updates)
      .where(and(eq(emails.id, emailId), eq(emails.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ email: toEmailDTO(updated, null) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/inbox PATCH]", err);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}
