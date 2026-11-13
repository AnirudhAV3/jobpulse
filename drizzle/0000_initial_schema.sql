CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"ats_score" integer DEFAULT 0 NOT NULL,
	"matched_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gap_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tailored_resume" text DEFAULT '' NOT NULL,
	"ai_engine" text DEFAULT 'builtin' NOT NULL,
	"coverage" integer DEFAULT 0 NOT NULL,
	"ats_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auth_method" text DEFAULT 'manual' NOT NULL,
	"gmail_account" text DEFAULT '' NOT NULL,
	"verification_state" jsonb DEFAULT 'null'::jsonb,
	"filled_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"missing_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"portal_url" text DEFAULT '' NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_event_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "avoid_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"linkedin_url" text DEFAULT '' NOT NULL,
	"portal_password" text DEFAULT '' NOT NULL,
	"auto_verify_portal_email" boolean DEFAULT false NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"experience_months" integer DEFAULT 0 NOT NULL,
	"extra_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ntfy_topic" text DEFAULT '' NOT NULL,
	"mobile_push_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"application_id" integer,
	"company" text NOT NULL,
	"from_address" text NOT NULL,
	"message_id" text,
	"source" text DEFAULT 'imap' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"type" text DEFAULT 'response' NOT NULL,
	"otp_code" text,
	"confirm_url" text,
	"read" boolean DEFAULT false NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"workplace" text DEFAULT 'On-site' NOT NULL,
	"employment_type" text DEFAULT 'Full-time' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"currency" text DEFAULT 'INR' NOT NULL,
	"experience" text DEFAULT '2-5 yrs' NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"portal" text DEFAULT 'careers' NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"match_score" integer DEFAULT 0 NOT NULL,
	"matched" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"application_id" integer NOT NULL,
	"company" text NOT NULL,
	"job_title" text NOT NULL,
	"portal" text NOT NULL,
	"missing_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"push_delivered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "preferred_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT 'Base Resume' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source" text DEFAULT 'cron' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"jobs_found" integer DEFAULT 0 NOT NULL,
	"jobs_new" integer DEFAULT 0 NOT NULL,
	"skipped_avoided" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "target_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"auth_provider" text DEFAULT 'credentials' NOT NULL,
	"oauth_subject" text,
	"scheduler_enabled" boolean DEFAULT false NOT NULL,
	"interval_minutes" integer DEFAULT 5 NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avoid_companies" ADD CONSTRAINT "avoid_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profile" ADD CONSTRAINT "candidate_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_notifications" ADD CONSTRAINT "mobile_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_notifications" ADD CONSTRAINT "mobile_notifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferred_locations" ADD CONSTRAINT "preferred_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_roles" ADD CONSTRAINT "target_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_status_idx" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "avoid_user_name_unique" ON "avoid_companies" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_user_msg_unique" ON "emails" USING btree ("user_id","message_id");--> statement-breakpoint
CREATE INDEX "emails_received_idx" ON "emails" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_user_ext_unique" ON "jobs" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "jobs_user_status_idx" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "jobs_matched_idx" ON "jobs" USING btree ("user_id","matched");--> statement-breakpoint
CREATE INDEX "jobs_created_idx" ON "jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "mobile_notifications_user_status_idx" ON "mobile_notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_user_name_unique" ON "preferred_locations" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "target_roles_user_name_unique" ON "target_roles" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_key_unique" ON "user_settings" USING btree ("user_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_oauth_identity_unique" ON "users" USING btree ("auth_provider","oauth_subject");