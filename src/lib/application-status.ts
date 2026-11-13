import type { TimelineEvent } from "@/db/schema";

export function isUserConfirmedSubmission(
  timeline: TimelineEvent[] | null | undefined
): boolean {
  return Boolean(
    timeline?.some((event) => event.label.startsWith("Marked submitted by you"))
  );
}
