# Security notes

What this project does, and what it does not claim.

## What protects the data

- **Row-level security in Postgres.** Every clinic table has policies that decide who can read or write each row, based on the signed-in user's id and role. The application cannot bypass them for a signed-in user.
- **Trusted roles.** A user's role lives in Supabase `app_metadata`, which users cannot edit.
- **Sensitive actions are database functions** that check the role and the allowed state themselves: joining a plan, submitting a claim, moving a claim, editing a profile.
- **Audit log.** Changes to patients, appointments, claims and Care Plans are recorded by database triggers. Personal values are not copied into the log, and rows cannot be edited or deleted.
- **Scheduled jobs and the payment webhook** are the only code that uses the service role. Jobs require a secret bearer token; the webhook requires a valid PayFast signature, the right merchant and is idempotent.
- **No secrets in the repository.** Only variable names are committed (`.env.example`). `logins.txt` is ignored.
- **Offline mode stores nothing.** The service worker shows an offline page and never caches pages or records.
- **Tests.** The row-level security rules are tested on a real PostgreSQL on every push (`tests/sql`).

## What is not claimed

- Payments are demo records. No card is charged and only brand, last four digits and expiry are stored.
- No POPIA or other compliance is claimed. A legal and privacy review is needed before real patient data is used.
- Demo accounts have simple passwords. Change or remove them before anything real is stored.

## Reporting a problem

Open a GitHub issue without sensitive details, or contact the repository owner.
