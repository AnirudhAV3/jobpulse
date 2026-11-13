import { NextRequest, NextResponse } from "next/server";
import { executeTickAllUsers } from "@/lib/engine";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!expectedSecret || Buffer.byteLength(expectedSecret) < 32) {
      console.error("[api/cron/scrape POST] CRON_SECRET is missing or too short");
      return NextResponse.json({ error: "Scraper trigger is not configured" }, { status: 503 });
    }
    const provided = Buffer.from(token);
    const expected = Buffer.from(expectedSecret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeTickAllUsers("github_actions");
    return NextResponse.json({
      ok: result.failedUsers === 0,
      triggeredBy: "external_cron",
      ...result,
      at: new Date().toISOString(),
    }, { status: result.failedUsers === 0 ? 200 : 500 });
  } catch (err) {
    console.error("[api/cron/scrape POST]", err);
    return NextResponse.json({ error: "Cron run failed" }, { status: 500 });
  }
}
