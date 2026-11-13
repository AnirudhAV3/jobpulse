# JobPulse deployment and integrations

## Current capability boundary

JobPulse currently stores tracked roles, compares resume keywords, prepares application drafts, imports selected mailbox messages, and can send opt-in web push alerts for newly imported messages.

- A draft is not submitted to an employer. Open the employer website and submit it yourself, then mark it submitted in Applications.
- The scraper reads configured public Greenhouse and Lever job boards. GitHub Actions runs it every five minutes for users who enable scheduled scraping; scheduled runs are best-effort, not real-time.
- Mobile Prompts and automated portal sign-in/form submission are not supported.
- Mailbox and browser notification permissions are optional; signing in does not grant either permission.

Do not advertise automatic job scraping or application submission until those integrations are implemented and tested.

## Netlify and Neon

1. In Neon, open the `jobpulse` project, choose the production branch and `neondb` database, then copy its pooled PostgreSQL connection string. Do not put the database password or connection string in source control or chat.
2. The GitHub Actions workflow at `.github/workflows/netlify-deploy.yml` deploys the `main` branch to the Netlify site `jobpulse-job-search` on Ubuntu. The included `netlify.toml` selects the Next.js plugin and Node.js 22.
3. Configure these Netlify environment variables for the production deploy context:

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled PostgreSQL URI, with SSL enabled |
   | `AUTH_SECRET` | Random session-signing secret, at least 32 bytes |
   | `INBOX_ENCRYPTION_KEY` | Random secret used to encrypt mailbox app passwords at rest; keep it stable |
   | `NEXT_PUBLIC_APP_URL` | Public HTTPS URL of the deployed app |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in OAuth web client |
   | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft/Outlook sign-in app |
   | `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OpenID Connect app |
   | `VAPID_PUBLIC_KEY` | Public Web Push application-server key; optional until push is enabled |
   | `VAPID_PRIVATE_KEY` | Private Web Push key; keep secret |
   | `VAPID_CONTACT` | A contact URI, for example `mailto:admin@example.com` |
   | `CRON_SECRET` | Optional secret for the protected Netlify worker endpoint; the scheduled GitHub workflow connects directly to PostgreSQL |
   | `JOB_SOURCES_JSON` | JSON array of configured Greenhouse/Lever boards |

4. Generate independent secrets locally; do not commit them:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Run this separately for `AUTH_SECRET`, `INBOX_ENCRYPTION_KEY`, and `CRON_SECRET`. Changing `INBOX_ENCRYPTION_KEY` makes previously encrypted mailbox passwords unreadable.

5. Apply the schema to the Neon database. For a new, empty database, temporarily put its connection URI in the git-ignored `.env.local` as `DATABASE_URL`, then run:

   ```powershell
   npx.cmd drizzle-kit push
   ```

   The command applies the schema in `src/db/schema.ts`. Confirm the selected Neon project before proceeding; back up any database that already contains data.

6. Configure GitHub Actions repository secret `NETLIFY_AUTH_TOKEN` with a Netlify personal access token. Also configure the repository secret `DATABASE_URL` for the scraper. The Netlify deploy workflow only needs the Netlify token; the site ID is already configured in the workflow. Never put either token or database URI in repository variables or source files.

## Google, Outlook, and LinkedIn sign-in

The sign-in page offers Google, Outlook, and LinkedIn using an OAuth authorization-code flow with PKCE and state validation. Register the following exact redirect URIs with each provider, replacing the host with the deployed site's origin:

```text
https://jobpulse-job-search.netlify.app/api/auth/oauth?provider=google
https://jobpulse-job-search.netlify.app/api/auth/oauth?provider=outlook
https://jobpulse-job-search.netlify.app/api/auth/oauth?provider=linkedin
```

Set each provider's client ID and secret in Netlify. Apply the updated Drizzle schema before enabling sign-in; it adds a unique provider-subject mapping to users. Existing email/password accounts can be linked only when the OAuth provider marks the same email verified. Google and LinkedIn accounts also require a verified email when creating a new account. Microsoft may provide a stable account identity and username without an `email_verified` claim; in that case, JobPulse allows a provider-bound Outlook account but will not link it to an existing account with the same email. There is no default password or automatic mailbox/device permission grant.

OAuth credentials and correctly registered callback URLs are deployment prerequisites; showing a provider button does not mean that provider is configured. For local sign-in, set provider credentials and `NEXT_PUBLIC_APP_URL=http://localhost:3000`, then register matching localhost callback URIs where the provider allows them.

## GitHub Actions scraper

The workflow at `.github/workflows/jobpulse-scraper.yml` runs every five minutes and can also be started manually from the Actions tab. It runs the scraper on a GitHub-hosted runner, not inside a Netlify function. Add:

- Repository secret `DATABASE_URL`: the PostgreSQL connection string used by the app. For production, use a dedicated database role with only the permissions the scraper needs, and allow connections from GitHub-hosted runners.
- Repository variable `JOB_SOURCES_JSON`: a JSON array of employer boards, for example:

  ```json
  [{"provider":"greenhouse","company":"Example Co","board":"exampleco"},{"provider":"lever","company":"Example Inc","board":"exampleinc"}]
  ```

For Greenhouse, `board` is the board token; for Lever, it is the site slug. The worker supports only those public job-board feeds. Add only boards you are authorized to access and have reviewed for source terms. Users must enable scheduled scraping in their account; their saved role, location, and avoided-company preferences are applied to results.

The workflow is public if this repository is public, but `DATABASE_URL` must be stored as a GitHub Actions secret, not in the workflow or repository variables. Restrict write access to trusted maintainers. Scheduled runs can be delayed by GitHub and require an enabled workflow on the repository's default branch.

The GitHub Actions database secret should use the same Neon pooled URI as Netlify. Keep it a repository **secret**, never a variable.

## Connecting an inbox

From **Inbox**, choose a supported provider, enter the mailbox address and a provider-issued app password, select **Test Connection**, then **Save & Sync Inbox**. The app uses TLS IMAP and stores the credential encrypted with `INBOX_ENCRYPTION_KEY`. Disconnect the mailbox from Inbox settings to remove its saved configuration.

- **Gmail / Google Workspace:** enable 2-Step Verification. Google only offers App Passwords for eligible accounts and configurations. Use a generated app password, never your normal password.
- **Yahoo:** use a Yahoo-generated app password.
- **iCloud:** create an app-specific password in Apple Account settings.
- **Outlook / Microsoft 365:** IMAP availability depends on the account and tenant. The Outlook button on the sign-in page only signs in to JobPulse; it does not connect or grant access to the mailbox.

Mail is synced when the user requests it. No provider consent is granted automatically on login. Verify outbound IMAP connectivity and function time limits in the deployed Netlify environment before relying on inbox sync.

## Enabling web push

1. Generate a VAPID key pair locally:

   ```powershell
   node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys(), null, 2))"
   ```

2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_CONTACT` in Netlify. Keep the private key secret.
3. Redeploy, sign in, open **Settings**, and select **Enable push on this device**. The browser permission prompt appears only after this click.
4. On iPhone, install the site to the Home Screen and open it there before enabling push. Support depends on the browser and OS.

Push currently reports new messages imported during inbox sync. It does not notify users about scraped jobs or portal prompts.

## Remaining production work

Before treating the service as production-ready, verify the configured feeds and scheduled runs, and add account email verification, password recovery, and registration/login rate limiting. OAuth is for JobPulse sign-in only and does not grant mailbox access. Review data retention, privacy disclosures, backups, and monitoring for the chosen hosting/database providers.
