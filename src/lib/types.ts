import type {
  MissingFieldSpec,
  PortalVerificationState,
  TimelineEvent,
} from "@/db/schema";

export type { MissingFieldSpec, PortalVerificationState };

export interface AuthUserDTO {
  id: number;
  email: string;
  name: string;
  authProvider: string;
  schedulerEnabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
}

export interface JobDTO {
  id: number;
  title: string;
  company: string;
  location: string;
  workplace: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  experience: string;
  description: string;
  url: string;
  source: string; // portal system
  portal: string; // portal host
  keywords: string[]; // skill ids
  matchScore: number;
  matched: boolean;
  status: string;
  postedAt: string;
  createdAt: string;
}

export interface AtsBreakdownItem {
  id: string;
  name: string;
  score: number;
  notes: string[];
}

export interface ApplicationDTO {
  id: number;
  jobId: number;
  status: string; // draft | applied (confirmed by the user)
  atsScore: number;
  aiEngine: string; // legacy field; drafts use "builtin"
  coverage: number;
  atsBreakdown: AtsBreakdownItem[];
  matchedKeywords: string[];
  gapKeywords: string[];
  tailoredResume: string;
  authMethod: string; // manual
  gmailAccount: string;
  verificationState: PortalVerificationState | null;
  filledFields: Record<string, string>;
  missingFields: MissingFieldSpec[];
  portalUrl: string;
  timeline: TimelineEvent[];
  createdAt: string;
  appliedAt: string | null;
  job: JobDTO | null;
}

export interface EmailDTO {
  id: number;
  applicationId: number | null;
  source: string; // mailbox sync source
  company: string;
  fromAddress: string;
  subject: string;
  body: string;
  type: string; // response | assessment | interview | rejection | offer | verification
  otpCode: string | null;
  confirmUrl: string | null;
  read: boolean;
  attended: boolean;
  receivedAt: string;
  jobTitle: string | null;
}

export interface ActivityItem {
  id: string;
  kind: "job" | "application" | "email";
  text: string;
  at: string;
}

export interface StatsDTO {
  jobsScraped: number;
  jobsMatched: number;
  interested: number;
  applied: number;
  responses: number;
  assessments: number;
  interviews: number;
  attended: number;
  unread: number;
  runs: number;
  lastRunAt: string | null;
  lastFound: number;
  lastNew: number;
  recent: ActivityItem[];
}

export interface SchedulerDTO {
  enabled: boolean;
  running: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  intervalMinutes: number;
  seeded: boolean;
  companies: number;
  configured: boolean;
}

export interface AvoidCompanyDTO {
  id: number;
  name: string;
  createdAt: string;
}

export interface LocationDTO {
  id: number;
  name: string;
  createdAt: string;
}

export interface TargetRoleDTO {
  id: number;
  name: string;
  expandedHeadings: string[];
  createdAt: string;
}

export type MailPresetId = "gmail" | "outlook" | "yahoo" | "icloud";

export interface InboxConfigDTO {
  connected: boolean;
  enabled: boolean;
  preset: MailPresetId;
  email: string;
  host: string;
  port: number;
  secure: boolean;
  hasPassword: boolean;
  maskedPassword: string | null;
  recruiterOnly: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncCount: number;
}
