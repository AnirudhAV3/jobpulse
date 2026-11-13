import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { executeTickForUser } from "@/lib/engine";

const MIN_INTERVAL = 5;
const MAX_INTERVAL = 10;

export async function updateUserScheduler(
  userId: number,
  patch: { enabled?: boolean; intervalMinutes?: number }
) {
  const values: Partial<{ schedulerEnabled: boolean; intervalMinutes: number }> = {};
  if (typeof patch.enabled === "boolean") values.schedulerEnabled = patch.enabled;
  if (typeof patch.intervalMinutes === "number" && Number.isFinite(patch.intervalMinutes)) {
    values.intervalMinutes = Math.min(
      MAX_INTERVAL,
      Math.max(MIN_INTERVAL, Math.round(patch.intervalMinutes))
    );
  }
  if (Object.keys(values).length > 0) {
    await db.update(users).set(values).where(eq(users.id, userId));
  }
  return schedulerStatusForUser(userId);
}

export async function schedulerStatusForUser(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const enabled = user?.schedulerEnabled ?? false;
  const intervalMinutes = user?.intervalMinutes ?? MIN_INTERVAL;
  const lastRunAt = user?.lastRunAt?.toISOString() ?? null;
  const nextRunAt =
    enabled && lastRunAt
      ? new Date(new Date(lastRunAt).getTime() + intervalMinutes * 60_000).toISOString()
      : null;

  return {
    enabled,
    running: false,
    lastRunAt,
    nextRunAt,
    intervalMinutes,
    seeded: Boolean(user?.lastRunAt),
    companies: 0,
    scheduler: "github-actions",
    configured: Boolean(process.env.JOB_SOURCES_JSON),
  };
}
