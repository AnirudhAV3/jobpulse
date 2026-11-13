export type JobSourceProvider = "greenhouse" | "lever";

export interface JobSourceConfig {
  provider: JobSourceProvider;
  company: string;
  board: string;
}

export interface SourceJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  workplace: string;
  employmentType: string;
  description: string;
  url: string;
  source: JobSourceProvider;
  portal: string;
  sourceTimestamp: Date;
}

function isSourceConfig(value: unknown): value is JobSourceConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return (
    (config.provider === "greenhouse" || config.provider === "lever") &&
    typeof config.company === "string" &&
    config.company.trim().length > 0 &&
    typeof config.board === "string" &&
    /^[a-zA-Z0-9_-]+$/.test(config.board)
  );
}

export function getConfiguredJobSources(): JobSourceConfig[] {
  const raw = process.env.JOB_SOURCES_JSON?.trim();
  if (!raw) throw new Error("JOB_SOURCES_JSON is not configured");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JOB_SOURCES_JSON must contain a valid JSON array");
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isSourceConfig)) {
    throw new Error(
      'JOB_SOURCES_JSON must be a non-empty array of { "provider": "greenhouse" | "lever", "company": "...", "board": "..." } entries'
    );
  }
  return parsed;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "JobPulse/1.0 job-feed reader" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Job source request failed (${response.status}): ${new URL(url).hostname}`);
  }
  return response.json();
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function safeJobUrl(value: unknown, provider: JobSourceProvider): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const allowedHosts =
      provider === "greenhouse"
        ? ["boards.greenhouse.io", "job-boards.greenhouse.io"]
        : ["jobs.lever.co"];
    return url.protocol === "https:" && allowedHosts.includes(url.hostname) ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeWorkplace(value: unknown, location: string): string {
  const text = `${safeText(value)} ${location}`.toLowerCase();
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  return "On-site";
}

export async function fetchSourceJobs(config: JobSourceConfig): Promise<SourceJob[]> {
  if (config.provider === "greenhouse") {
    const data = (await fetchJson(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(config.board)}/jobs?content=true`
    )) as { jobs?: Array<Record<string, unknown>> };

    return (data.jobs ?? []).flatMap((job) => {
      const location =
        job.location && typeof job.location === "object"
          ? safeText((job.location as Record<string, unknown>).name)
          : "";
      const url = safeJobUrl(job.absolute_url, config.provider);
      const timestamp = parseDate(job.updated_at);
      if (typeof job.id !== "number" || !safeText(job.title) || !url || !timestamp) return [];
      return [{
        externalId: `greenhouse:${config.board}:${job.id}`,
        title: safeText(job.title),
        company: config.company.trim(),
        location: location || "Location not specified",
        workplace: normalizeWorkplace("", location),
        employmentType: "Not specified",
        description: safeText(job.content) || "No description provided.",
        url,
        source: "greenhouse",
        portal: "boards-api.greenhouse.io",
        sourceTimestamp: timestamp,
      }];
    });
  }

  const data = await fetchJson(
    `https://api.lever.co/v0/postings/${encodeURIComponent(config.board)}?mode=json`
  );
  if (!Array.isArray(data)) {
    throw new Error(`Lever feed for ${config.company} returned an invalid response`);
  }
  return data.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const job = entry as Record<string, unknown>;
    const categories =
      job.categories && typeof job.categories === "object"
        ? (job.categories as Record<string, unknown>)
        : {};
    const location = safeText(categories.location) || "Location not specified";
    const url = safeJobUrl(job.hostedUrl, config.provider);
    const timestamp = parseDate(job.createdAt);
    if (!safeText(job.id) || !safeText(job.text) || !url || !timestamp) return [];
    return [{
      externalId: `lever:${config.board}:${safeText(job.id)}`,
      title: safeText(job.text),
      company: config.company.trim(),
      location,
      workplace: normalizeWorkplace(job.workplaceType, location),
      employmentType: safeText(categories.commitment) || "Not specified",
      description: safeText(job.descriptionPlain) || "No description provided.",
      url,
      source: "lever",
      portal: "jobs.lever.co",
      sourceTimestamp: timestamp,
    }];
  });
}
