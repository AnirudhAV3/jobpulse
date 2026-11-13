import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import {
  schedulerStatusForUser,
  updateUserScheduler,
} from "@/lib/scheduler";
import { runScrape } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await schedulerStatusForUser(user.id));
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load scheduler" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { enabled?: boolean; intervalMinutes?: number };
    const status = await updateUserScheduler(user.id, body);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/scheduler PATCH]", err);
    return NextResponse.json({ error: "Failed to update scheduler" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    return NextResponse.json(await runScrape(user.id, "manual"));
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/scheduler POST]", err);
    return NextResponse.json({ error: "Manual run failed" }, { status: 500 });
  }
}
