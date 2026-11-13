import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import {
  disconnectInbox,
  getInboxConfigDTO,
  saveInboxConfig,
  syncImapInbox,
  testImapConnection,
} from "@/lib/imap-sync";
import type { MailPresetId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ config: await getInboxConfigDTO(user.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/inbox/config GET]", err);
    return NextResponse.json({ error: "Failed to load inbox config" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      enabled?: boolean;
      preset?: MailPresetId;
      email?: string;
      password?: string;
      host?: string;
      port?: number;
      secure?: boolean;
      recruiterOnly?: boolean;
      syncNow?: boolean;
    };

    const config = await saveInboxConfig(user.id, body);
    let syncResult: Awaited<ReturnType<typeof syncImapInbox>> | null = null;
    if (body.syncNow && config.connected && config.enabled) {
      syncResult = await syncImapInbox(user.id);
    }
    return NextResponse.json({
      config: await getInboxConfigDTO(user.id),
      sync: syncResult,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      err instanceof Error &&
      (/supported email provider|Outlook mailbox sign-in|valid email address/i.test(err.message))
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[api/inbox/config PUT]", err);
    return NextResponse.json({ error: "Failed to save inbox config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      action?: "test" | "sync";
      preset?: MailPresetId;
      email?: string;
      password?: string;
      host?: string;
      port?: number;
      secure?: boolean;
    };

    if (body.action === "sync") {
      const result = await syncImapInbox(user.id);
      return NextResponse.json({
        ...result,
        config: await getInboxConfigDTO(user.id),
      });
    }

    const res = await testImapConnection(user.id, {
      preset: body.preset ?? "gmail",
      email: body.email ?? "",
      password: body.password,
      host: body.host,
      port: body.port,
      secure: body.secure,
    });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/inbox/config POST]", err);
    return NextResponse.json({ ok: false, message: "Inbox action failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    const config = await disconnectInbox(user.id);
    return NextResponse.json({ config });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/inbox/config DELETE]", err);
    return NextResponse.json({ error: "Failed to disconnect inbox" }, { status: 500 });
  }
}
