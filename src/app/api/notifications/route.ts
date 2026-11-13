import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import {
  getPushPublicKey,
  listPushSubscriptions,
  removePushSubscription,
  savePushSubscription,
  type BrowserPushSubscription,
} from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const subscriptions = await listPushSubscriptions(user.id);
    return NextResponse.json({
      configured: Boolean(getPushPublicKey()),
      publicKey: getPushPublicKey(),
      enabled: subscriptions.length > 0,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/notifications GET]", error);
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { subscription?: BrowserPushSubscription };
    const subscription = body.subscription;
    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      typeof subscription.keys?.p256dh !== "string" ||
      typeof subscription.keys?.auth !== "string"
    ) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }
    if (!getPushPublicKey()) {
      return NextResponse.json(
        { error: "Push notifications are not configured on this deployment" },
        { status: 503 }
      );
    }

    await savePushSubscription(user.id, subscription);
    return NextResponse.json({ enabled: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("already linked")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/notifications POST]", error);
    return NextResponse.json({ error: "Failed to enable notifications" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { endpoint?: string };
    if (typeof body.endpoint !== "string" || !body.endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid push endpoint" }, { status: 400 });
    }
    await removePushSubscription(user.id, body.endpoint);
    return NextResponse.json({ enabled: false });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/notifications DELETE]", error);
    return NextResponse.json({ error: "Failed to disable notifications" }, { status: 500 });
  }
}
