import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  avoidCompanies,
  jobs,
  preferredLocations,
  resumes,
  scrapeRuns,
  targetRoles,
  users,
} from "@/db/schema";
import { extractSkills, matchScore } from "@/lib/ats";
import { fetchSourceJobs, getConfiguredJobSources } from "@/lib/job-sources";
import { syncImapInbox } from "@/lib/imap-sync";

export const DEFAULT_TARGET_ROLE = "Business Analyst (BA)";

export interface RoleTitleSpec {
  title: string;
  exp: string;
  mid: boolean;
}

export const BA_TITLE_POOL: RoleTitleSpec[] = [
  { title: "Business Analyst", exp: "2-5 yrs", mid: true },
  { title: "Business Analyst", exp: "1-3 yrs", mid: false },
  { title: "Senior Business Analyst", exp: "5-8 yrs", mid: false },
  { title: "Junior Business Analyst", exp: "0-2 yrs", mid: false },
  { title: "Associate Business Analyst", exp: "1-3 yrs", mid: false },
  { title: "IT Business Analyst", exp: "3-6 yrs", mid: true },
  { title: "Business Systems Analyst", exp: "2-5 yrs", mid: true },
  { title: "Functional Business Analyst", exp: "3-6 yrs", mid: true },
  { title: "Technical Business Analyst", exp: "4-7 yrs", mid: true },
  { title: "Product Business Analyst", exp: "2-5 yrs", mid: true },
  { title: "Agile Business Analyst", exp: "2-5 yrs", mid: true },
  { title: "Digital Business Analyst", exp: "2-5 yrs", mid: true },
  { title: "Business Intelligence Analyst", exp: "2-5 yrs", mid: true },
  { title: "Business Operations Analyst", exp: "1-4 yrs", mid: true },
  { title: "Process Business Analyst", exp: "2-4 yrs", mid: false },
  { title: "Lead Business Analyst", exp: "7-10 yrs", mid: false },
];

export function isBaUmbrellaRole(raw: string): boolean {
  const norm = raw.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  return ["ba", "business analyst", "business analyst ba", "ba business analyst", "all ba roles"].includes(norm);
}

export function expandHeadingsForRole(roleName: string): RoleTitleSpec[] {
  const clean = roleName.trim();
  if (!clean || isBaUmbrellaRole(clean)) return BA_TITLE_POOL;

  if (/^(senior|junior|associate|lead|principal|staff|intern)\b/i.test(clean)) {
    const senior = /^(senior|lead|principal|staff)/i.test(clean);
    const junior = /^(junior|associate|intern)/i.test(clean);
    return [{ title: clean, exp: senior ? "5-8 yrs" : junior ? "0-2 yrs" : "2-5 yrs", mid: !senior && !junior }];
  }

  return [
    { title: clean, exp: "2-5 yrs", mid: true },
    { title: clean, exp: "1-3 yrs", mid: false },
    { title: `Senior ${clean}`, exp: "5-8 yrs", mid: true },
    { title: `Associate ${clean}`, exp: "0-2 yrs", mid: false },
    { title: `Lead ${clean}`, exp: "6-9 yrs", mid: false },
  ];
}

export function expandedHeadingNamesForRole(roleName: string): string[] {
  return Array.from(new Set(expandHeadingsForRole(roleName).map((heading) => heading.title)));
}

export function jobMatchesTargetRoles(jobTitle: string, roleNames: string[]): boolean {
  if (!roleNames.length) return true;
  const lowerTitle = jobTitle.toLowerCase();
  return roleNames.some((role) => {
    if (isBaUmbrellaRole(role)) {
      return /\b(business.*analyst|product analyst|process analyst|operations analyst|systems analyst|functional analyst|technical analyst|intelligence analyst|ba)\b/i.test(jobTitle);
    }
    const clean = role.toLowerCase().trim();
    if (!clean) return false;
    if (lowerTitle.includes(clean) || clean.includes(lowerTitle)) return true;
    const words = clean.split(/\s+/).filter((word) => word.length > 2);
    return words.length > 0 && words.every((word) => lowerTitle.includes(word));
  });
}

export interface TickSummary {
  jobsFound: number;
  jobsNew: number;
  skippedAvoided: number;
  portals: number;
  source: string;
  at: string;
  message: string;
}

export async function runScrape(
  userId: number,
  source: "cron" | "manual" | "github_actions"
): Promise<TickSummary> {
  const startedAt = new Date();
  const [run] = await db
    .insert(scrapeRuns)
    .values({ userId, source, status: "running", startedAt })
    .returning({ id: scrapeRuns.id });
  let jobsFound = 0;
  let jobsNew = 0;
  let skippedAvoided = 0;
  const portals = new Set<string>();

  try {
    const sources = getConfiguredJobSources();
    const [resumeRows, avoidedRows, locationRows, roleRows] = await Promise.all([
      db.select({ content: resumes.content }).from(resumes).where(eq(resumes.userId, userId)).limit(1),
      db.select({ name: avoidCompanies.name }).from(avoidCompanies).where(eq(avoidCompanies.userId, userId)),
      db.select({ name: preferredLocations.name }).from(preferredLocations).where(eq(preferredLocations.userId, userId)),
      db.select({ name: targetRoles.name }).from(targetRoles).where(eq(targetRoles.userId, userId)),
    ]);
    const resumeText = resumeRows[0]?.content ?? "";
    const avoidedCompanies = avoidedRows.map((row) => row.name.toLowerCase().trim()).filter(Boolean);
    const preferredLocationsList = locationRows.map((row) => row.name.trim()).filter(Boolean);
    const targetRoleNames = roleRows.map((row) => row.name.trim()).filter(Boolean);
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const matchesLocation = (jobLocation: string, workplace: string, target: string) => {
      const requested = normalize(target);
      if (requested.startsWith("remote")) return workplace.toLowerCase() === "remote";
      const location = normalize(jobLocation);
      return requested.split(" ").every((part) => {
        if (part === "bengaluru" || part === "bangalore") {
          return location.includes("bengaluru") || location.includes("bangalore");
        }
        return location.includes(part);
      });
    };

    for (const sourceConfig of sources) {
      const sourceJobs = await fetchSourceJobs(sourceConfig);
      portals.add(sourceConfig.provider);
      for (const job of sourceJobs) {
        if (
          (preferredLocationsList.length > 0 &&
            !preferredLocationsList.some((location) =>
              matchesLocation(job.location, job.workplace, location)
            )) ||
          !jobMatchesTargetRoles(job.title, targetRoleNames)
        ) {
          continue;
        }

        jobsFound++;
        const company = job.company.toLowerCase();
        if (
          avoidedCompanies.some(
            (avoided) => company.includes(avoided) || avoided.includes(company)
          )
        ) {
          skippedAvoided++;
          continue;
        }

        const keywordIds = extractSkills(job.description).map((skill) => skill.id);
        const hasResume = resumeText.trim().length >= 50;
        const score = hasResume && keywordIds.length > 0 ? matchScore(resumeText, keywordIds) : 0;
        const inserted = await db
          .insert(jobs)
          .values({
            userId,
            externalId: job.externalId,
            title: job.title,
            company: job.company,
            location: job.location,
            workplace: job.workplace,
            employmentType: job.employmentType,
            experience: "Not specified",
            description: job.description,
            url: job.url,
            source: job.source,
            portal: job.portal,
            keywords: keywordIds,
            matchScore: score,
            matched: hasResume && keywordIds.length > 0 && score >= 52,
            status: "new",
            postedAt: job.sourceTimestamp,
          })
          .onConflictDoNothing({ target: [jobs.userId, jobs.externalId] })
          .returning({ id: jobs.id });
        jobsNew += inserted.length;
      }
    }

    const finishedAt = new Date();
    await db
      .update(scrapeRuns)
      .set({ status: "success", jobsFound, jobsNew, skippedAvoided, finishedAt })
      .where(eq(scrapeRuns.id, run.id));
    await db.update(users).set({ lastRunAt: finishedAt }).where(eq(users.id, userId));

    return {
      jobsFound,
      jobsNew,
      skippedAvoided,
      portals: portals.size,
      source,
      at: finishedAt.toISOString(),
      message: `Fetched ${jobsFound} matching listings and added ${jobsNew} new jobs.`,
    };
  } catch (error) {
    try {
      await db
        .update(scrapeRuns)
        .set({ status: "failed", finishedAt: new Date() })
        .where(eq(scrapeRuns.id, run.id));
    } catch (updateError) {
      console.error("[scraper] Failed to record scrape failure", updateError);
    }
    throw error;
  }
}

export async function executeTickForUser(
  userId: number,
  source: "cron" | "manual" | "github_actions"
): Promise<TickSummary> {
  const summary = await runScrape(userId, source);
  await syncImapInbox(userId);
  await db.update(users).set({ lastRunAt: new Date() }).where(eq(users.id, userId));
  return summary;
}

export async function executeTickAllUsers(
  source: "cron" | "github_actions" = "cron"
): Promise<{ usersProcessed: number; totalJobsNew: number; failedUsers: number; message: string }> {
  const enabledUsers = await db.select().from(users).where(eq(users.schedulerEnabled, true));
  let usersProcessed = 0;
  let totalJobsNew = 0;
  let failedUsers = 0;

  for (const user of enabledUsers) {
    const dueAt = user.lastRunAt
      ? user.lastRunAt.getTime() + Math.max(1, user.intervalMinutes) * 60_000
      : 0;
    if (Date.now() < dueAt) continue;
    try {
      const summary = await runScrape(user.id, source);
      usersProcessed++;
      totalJobsNew += summary.jobsNew;
    } catch (error) {
      failedUsers++;
      console.error(`[scraper] User ${user.id} scrape failed`, error);
    }
  }

  return {
    usersProcessed,
    totalJobsNew,
    failedUsers,
    message: `Processed ${usersProcessed} users; ${failedUsers} scraper runs failed.`,
  };
}
