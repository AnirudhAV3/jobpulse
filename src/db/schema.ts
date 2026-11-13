import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  authProvider: text("auth_provider").notNull().default("credentials"), // credentials | google | outlook | linkedin
  oauthSubject: text("oauth_subject"),
  schedulerEnabled: boolean("scheduler_enabled").notNull().default(false),
  intervalMinutes: integer("interval_minutes").notNull().default(5),
  lastRunAt: timestamp("last_run_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [uniqueIndex("users_oauth_identity_unique").on(t.authProvider, t.oauthSubject)]);

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location").notNull(),
    workplace: text("workplace").notNull().default("On-site"),
    employmentType: text("employment_type").notNull().default("Full-time"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency").notNull().default("INR"),
    experience: text("experience").notNull().default("2-5 yrs"),
    description: text("description").notNull(),
    url: text("url").notNull(),
    source: text("source").notNull(), // Greenhouse | Lever | Workday | Company Portal | SuccessFactors
    portal: text("portal").notNull().default("careers"),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    matchScore: integer("match_score").notNull().default(0),
    matched: boolean("matched").notNull().default(false),
    status: text("status").notNull().default("new"), // new | interested | applied | archived
    postedAt: timestamp("posted_at", { mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("jobs_user_ext_unique").on(t.userId, t.externalId),
    index("jobs_user_status_idx").on(t.userId, t.status),
    index("jobs_matched_idx").on(t.userId, t.matched),
    index("jobs_created_idx").on(t.userId, t.createdAt),
  ]
);

export const avoidCompanies = pgTable(
  "avoid_companies",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("avoid_user_name_unique").on(t.userId, t.name)]
);

export const preferredLocations = pgTable(
  "preferred_locations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("locations_user_name_unique").on(t.userId, t.name)]
);

export const targetRoles = pgTable(
  "target_roles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("target_roles_user_name_unique").on(t.userId, t.name)]
);

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  name: text("name").notNull().default("Base Resume"),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const candidateProfile = pgTable("candidate_profile", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  portalPassword: text("portal_password").notNull().default(""),
  autoVerifyPortalEmail: boolean("auto_verify_portal_email").notNull().default(false),
  experienceYears: integer("experience_years").notNull().default(0),
  experienceMonths: integer("experience_months").notNull().default(0),
  extraFields: jsonb("extra_fields")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  ntfyTopic: text("ntfy_topic").notNull().default(""),
  mobilePushEnabled: boolean("mobile_push_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export interface TimelineEvent {
  status: string;
  label: string;
  at: string;
}

export interface MissingFieldSpec {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
  secret?: boolean;
}

export interface PortalVerificationState {
  required: boolean;
  kind: "email_otp" | "confirmation_link";
  status: "verified_auto" | "awaiting_verification" | "verified_manual";
  codeExpected?: string;
  confirmUrl?: string;
  resolvedVia?: string;
  verifiedAt?: string;
}

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" })
      .unique(),
    status: text("status").notNull().default("draft"), // draft | applied (confirmed by the user)
    atsScore: integer("ats_score").notNull().default(0),
    matchedKeywords: jsonb("matched_keywords").$type<string[]>().notNull().default([]),
    gapKeywords: jsonb("gap_keywords").$type<string[]>().notNull().default([]),
    tailoredResume: text("tailored_resume").notNull().default(""),
    aiEngine: text("ai_engine").notNull().default("builtin"),
    coverage: integer("coverage").notNull().default(0),
    atsBreakdown: jsonb("ats_breakdown")
      .$type<{ id: string; name: string; score: number; notes: string[] }[]>()
      .notNull()
      .default([]),
    authMethod: text("auth_method").notNull().default("manual"),
    gmailAccount: text("gmail_account").notNull().default(""),
    verificationState: jsonb("verification_state")
      .$type<PortalVerificationState | null>()
      .default(null),
    filledFields: jsonb("filled_fields")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    missingFields: jsonb("missing_fields")
      .$type<MissingFieldSpec[]>()
      .notNull()
      .default([]),
    portalUrl: text("portal_url").notNull().default(""),
    timeline: jsonb("timeline").$type<TimelineEvent[]>().notNull().default([]),
    nextEventAt: timestamp("next_event_at", { mode: "date", withTimezone: true }),
    appliedAt: timestamp("applied_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("applications_user_status_idx").on(t.userId, t.status),
  ]
);

export const emails = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: integer("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    company: text("company").notNull(),
    fromAddress: text("from_address").notNull(),
    messageId: text("message_id"),
    source: text("source").notNull().default("imap"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    type: text("type").notNull().default("response"), // response | assessment | interview | rejection | offer | verification
    otpCode: text("otp_code"),
    confirmUrl: text("confirm_url"),
    read: boolean("read").notNull().default(false),
    attended: boolean("attended").notNull().default(false),
    receivedAt: timestamp("received_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("emails_user_msg_unique").on(t.userId, t.messageId),
    index("emails_received_idx").on(t.userId, t.receivedAt),
  ]
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("user_settings_user_key_unique").on(t.userId, t.key)]
);

export const mobileNotifications = pgTable(
  "mobile_notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    jobTitle: text("job_title").notNull(),
    portal: text("portal").notNull(),
    missingFields: jsonb("missing_fields")
      .$type<MissingFieldSpec[]>()
      .notNull()
      .default([]),
    status: text("status").notNull().default("pending"), // pending | resolved
    pushDelivered: boolean("push_delivered").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { mode: "date", withTimezone: true }),
  },
  (t) => [index("mobile_notifications_user_status_idx").on(t.userId, t.status)]
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ]
);

export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("cron"), // cron | manual | github_actions
  status: text("status").notNull().default("running"), // running | success | failed
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsNew: integer("jobs_new").notNull().default(0),
  skippedAvoided: integer("skipped_avoided").notNull().default(0),
  startedAt: timestamp("started_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { mode: "date", withTimezone: true }),
});
