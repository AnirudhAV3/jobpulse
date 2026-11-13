import * as webPush from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export interface BrowserPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT;
  if (!publicKey || !privateKey || !contact) return null;
  return { publicKey, privateKey, contact };
}

export function getPushPublicKey(): string | null {
  return vapidConfig()?.publicKey ?? null;
}

export async function listPushSubscriptions(userId: number) {
  return db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function savePushSubscription(
  userId: number,
  subscription: BrowserPushSubscription
): Promise<void> {
  const endpointUrl = new URL(subscription.endpoint);
  if (
    endpointUrl.protocol !== "https:" ||
    subscription.endpoint.length > 2048 ||
    subscription.keys.p256dh.length > 256 ||
    subscription.keys.auth.length > 256
  ) {
    throw new Error("Invalid push subscription");
  }

  const [existing] = await db
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);
  if (existing && existing.userId !== userId) {
    throw new Error("Push subscription is already linked to another account");
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
}

export async function removePushSubscription(
  userId: number,
  endpoint: string
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );
}

export async function sendPushNotification(
  userId: number,
  notification: { title: string; body: string; url: string }
): Promise<number> {
  const config = vapidConfig();
  if (!config) return 0;

  webPush.setVapidDetails(config.contact, config.publicKey, config.privateKey);
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  let delivered = 0;

  for (const row of rows) {
    try {
      await webPush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify(notification),
        { TTL: 60 }
      );
      delivered++;
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? error.statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(userId, row.endpoint);
      } else {
        console.error("[push] Notification delivery failed", error);
      }
    }
  }

  return delivered;
}
