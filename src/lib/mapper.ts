import type {
  applications,
  avoidCompanies,
  emails,
  jobs,
  preferredLocations,
  targetRoles,
} from "@/db/schema";
import type {
  ApplicationDTO,
  AvoidCompanyDTO,
  EmailDTO,
  JobDTO,
  LocationDTO,
  TargetRoleDTO,
} from "@/lib/types";

type JobRow = typeof jobs.$inferSelect;
type AppRow = typeof applications.$inferSelect;
type EmailRow = typeof emails.$inferSelect;
type AvoidRow = typeof avoidCompanies.$inferSelect;
type LocationRow = typeof preferredLocations.$inferSelect;
type TargetRoleRow = typeof targetRoles.$inferSelect;

export function toJobDTO(j: JobRow): JobDTO {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    workplace: j.workplace,
    employmentType: j.employmentType,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency,
    experience: j.experience,
    description: j.description,
    url: j.url,
    source: j.source,
    portal: j.portal,
    keywords: j.keywords ?? [],
    matchScore: j.matchScore,
    matched: j.matched,
    status: j.status,
    postedAt: j.postedAt.toISOString(),
    createdAt: j.createdAt.toISOString(),
  };
}

export function toApplicationDTO(a: AppRow, job: JobRow | null): ApplicationDTO {
  return {
    id: a.id,
    jobId: a.jobId,
    status: a.status,
    atsScore: a.atsScore,
    aiEngine: a.aiEngine ?? "builtin",
    coverage: a.coverage,
    atsBreakdown: a.atsBreakdown ?? [],
    matchedKeywords: a.matchedKeywords ?? [],
    gapKeywords: a.gapKeywords ?? [],
    tailoredResume: a.tailoredResume,
    authMethod: a.authMethod ?? "manual",
    gmailAccount: a.gmailAccount ?? "",
    verificationState: a.verificationState ?? null,
    filledFields: a.filledFields ?? {},
    missingFields: a.missingFields ?? [],
    portalUrl: a.portalUrl,
    timeline: a.timeline ?? [],
    createdAt: a.createdAt.toISOString(),
    appliedAt: a.appliedAt ? a.appliedAt.toISOString() : null,
    job: job ? toJobDTO(job) : null,
  };
}

export function toEmailDTO(e: EmailRow, jobTitle: string | null): EmailDTO {
  return {
    id: e.id,
    applicationId: e.applicationId,
    source: e.source ?? "imap",
    company: e.company,
    fromAddress: e.fromAddress,
    subject: e.subject,
    body: e.body,
    type: e.type,
    otpCode: e.otpCode ?? null,
    confirmUrl: e.confirmUrl ?? null,
    read: e.read,
    attended: e.attended,
    receivedAt: e.receivedAt.toISOString(),
    jobTitle,
  };
}

export function toAvoidDTO(a: AvoidRow): AvoidCompanyDTO {
  return { id: a.id, name: a.name, createdAt: a.createdAt.toISOString() };
}

export function toLocationDTO(l: LocationRow): LocationDTO {
  return { id: l.id, name: l.name, createdAt: l.createdAt.toISOString() };
}

export function toTargetRoleDTO(
  r: TargetRoleRow,
  expandedHeadings: string[]
): TargetRoleDTO {
  return {
    id: r.id,
    name: r.name,
    expandedHeadings,
    createdAt: r.createdAt.toISOString(),
  };
}
