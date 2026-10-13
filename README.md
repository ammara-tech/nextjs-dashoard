# Patient and Billing Dashboard

A Next.js application with three separate dashboards, chosen from the landing page at `/`:

| Dashboard | Route | What it is |
|---|---|---|
| Family Clinic | `/clinic-hub` → `/medi-clinic` | Patients, doctors, reception, pharmacy and stock. Patient and clinic data live only here. |
| Next.js invoice dashboard | `/nextjs-hub` → `/dashboard` | The original customer, invoice and revenue dashboard. |
| Medical Aid (Care Plans) | `/medical-aid` | Join a Family Clinic Care Plan, save cards, choose the card the plan is paid from, and see cover and sample PDFs. Uses the same logins as the clinic. |

The landing page header shows the three logos with the title "Family Clinic Dashboard & Next.js Dashboard & Medical Aid Dashboard", and each dashboard has its own card.

The app also includes a separate family practice dashboard at `/medi-clinic`. It manages patients, appointments, and treatments; shows patient growth and appointment outcomes; and includes a tomorrow appointment list.

## Family Clinic deployed access links

- [Patient portal](https://nextjs-dashoard-psi.vercel.app/medi-clinic) — patient sign-in.
- [Administrative dashboard](https://nextjs-dashoard-psi.vercel.app/medi-clinic/dashboard) — administrative sign-in; staff accounts are provisioned with a name, surname, and occupation/role such as reception or nurse.
- [Doctors area](https://nextjs-dashoard-psi.vercel.app/medi-clinic/doctors) — doctor sign-in; doctor accounts are provisioned with the doctor's name and occupation.
- [Pharmacy area](https://nextjs-dashoard-psi.vercel.app/medi-clinic/pharmacy) — pharmacy sign-in; accounts are provisioned with a name, surname, and pharmacy role: front desk/reception, stocker, or pharmacist.

These links identify the deployed entry points. Users still need valid Supabase Auth accounts with the correct clinic role and clinic association; a URL alone does not create an account or grant access. The administrative link opens the existing clinic overview, and the doctors link opens the clinical workspace. Pharmacist and stock-manager roles access the pharmacy workspace; front-desk users are sent to the in-person payment register. A different signed-in role is sent to clinic sign-in with the requested route as the return destination.

## Features

- Sign in with Supabase Auth.
- View the dashboard overview, revenue, and latest invoices.
- Browse customers and search/filter invoices.
- Keep patient records out of the original dashboard; legacy patient URLs redirect to the family clinic.
- Open the family clinic dashboard at `/medi-clinic` with owner/front-desk access. The clinic layout is a header with a tab bar of links for your role (including Shifts); doctors also get a "Dr. Name · Switch" button.
- Manage appointments and owner-only treatments, review the two clinic charts, and view tomorrow's booked appointments with patient phone numbers.
- Enforce patient ownership in PostgreSQL with Supabase RLS policies.
- Keep the invoice and customer data layer backed by the existing `POSTGRES_URL` connection.
- Doctor sign-in opens a pop-up to choose which doctor you are, then shows that doctor's own dashboard (today's schedule, coming up, weekly shifts, patients). Doctors without database access to another doctor's data see clearly labelled sample data.
- Provider shifts are entered and shown as a day range (Monday to Friday by default), with a weekly grid per provider.
- Join a Family Clinic Care Plan at `/medical-aid` (Essential, Family Plus, Premium), pay from a chosen saved card (demo payment only), and open sample plan PDFs.
- Manage patient medical aid and co-payment coverage, with provider selection, dependent mapping, digital card uploads, verification badges, and in-network billing summaries.
- Dark and light mode, and an English / Afrikaans language toggle, in every header and on every login page.
- A guided demo tour, keyboard shortcuts, and live updates with a notification bell.
- An appointment calendar (week grid per doctor), Care Plan progress and payment tracking, medical aid claim tracking, and patient profile editing.

## Medical aid & co-payment flow

The patient portal now includes a dedicated medical aid panel designed around the project requirements for Family Clinic coverage verification and checkout experience. Patients can select a provider and plan, map the relevant dependent, upload a membership card image or PDF, and see status feedback for verification. The UI includes a scheme coverage summary, remaining medical savings account balance, and reward/wellness indicators so the patient can understand out-of-pocket cost expectations without leaving the portal.

This is implemented as a patient-facing clinic integration aligned to the `/medi-clinic` portal and keeps the role separation intact for the rest of the app.

## Technology/Stack used

- Next.js App Router and React
- TypeScript
- Supabase Auth, Supabase SSR client, and PostgreSQL RLS for patient records
- PostgreSQL via `postgres` for invoice and customer data
- Tailwind CSS

## Requirements

- Node.js and npm
- A Supabase project for authentication and the `patients` table
- A PostgreSQL database containing the invoice/customer tables for the dashboard features

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and enter the values for your Supabase and PostgreSQL projects:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   POSTGRES_URL=
   ```

   `AUTH_SECRET` and `AUTH_URL` remain in the template for the existing NextAuth API route. Patient sign-in and the dashboard access guard use Supabase Auth.

3. In the Supabase dashboard, create the clinic owner account under **Authentication → Users** and set trusted `app_metadata` to `{ "clinic_role": "owner" }`. Patient registration requires exactly one configured owner.

4. Run [`supabase/patients.sql`](./supabase/patients.sql) in the Supabase SQL Editor. It creates the patient table, enables RLS, grants authenticated access, adds owner-only policies, and creates an index on `user_id`.

5. Run [`supabase/medi-clinic.sql`](./supabase/medi-clinic.sql) after `patients.sql`. It adds appointments and treatments and updates patient ownership policies for the shared clinic.

6. Run [`supabase/clinic-scheduling.sql`](./supabase/clinic-scheduling.sql) after `medi-clinic.sql`. It adds providers, appointment types, weekly shifts, unavailable blocks, and database booking functions that enforce shifts, provider conflicts, and daily appointment limits.

7. Run [`supabase/clinic-platform.sql`](./supabase/clinic-platform.sql) after `clinic-scheduling.sql`. It adds patient-account linking, a private documents bucket and policies, signed encounter/addendum records, prescriptions, inventory, payment registers, wallet-ledger foundations, and a support-request queue. Apply reviewed SQL migrations using an appropriately privileged database connection.

8. Run [`supabase/clinic-patient-registration.sql`](./supabase/clinic-patient-registration.sql) after `clinic-platform.sql` to create and link each self-registered patient and grant the trusted patient role immediately.

9. Run [`supabase/clinic-patient-access-cleanup.sql`](./supabase/clinic-patient-access-cleanup.sql) after the registration migration. It grants patient access to existing pending requests and removes the retired approval queue. For an existing setup, rerun the registration migration first so the signup trigger grants access directly. This cleanup is safe to run on a new setup where the old queue does not exist; users whose access was just migrated should sign out and back in.

10. Set the trusted Supabase Auth `app_metadata` for each staff account using the Supabase Admin API from a secure server-side environment. Never expose the service-role key in the browser or commit it.

   - Owner: `{ "clinic_role": "owner" }`
   - Front desk: `{ "clinic_role": "front_desk", "clinic_owner_id": "<owner-auth-user-uuid>" }`
   - Doctor: `{ "clinic_role": "doctor", "clinic_owner_id": "<owner-auth-user-uuid>" }`
   - Patient: `{ "clinic_role": "patient", "clinic_owner_id": "<owner-auth-user-uuid>" }`
   - Pharmacist: `{ "clinic_role": "pharmacist", "clinic_owner_id": "<owner-auth-user-uuid>" }`
   - Stock manager: `{ "clinic_role": "stock_manager", "clinic_owner_id": "<owner-auth-user-uuid>" }`
   - Admin: `{ "clinic_role": "admin", "clinic_owner_id": "<owner-auth-user-uuid>" }`

   The owner ID defaults to the signed-in user's ID for the owner account. Other clinic accounts must use that same owner ID to access the practice. For doctor accounts, also set the provider's `auth_user_id` to the doctor's Supabase Auth UUID. For existing patients, use the owner-only patient action to link the existing patient record to the verified patient's Auth UUID. New self-registered patients are linked by the registration trigger. Staff role claims and existing-patient linking must be set only after verifying the account holder.

   To allow account holders to enter the portal immediately after signup, disable email confirmation in the Supabase Auth provider settings. If email confirmation remains enabled, users must confirm their email before Supabase creates a signed-in session.

11. Start the development server:

   ```bash
   npm run dev
   ```

12. Open [http://localhost:3000](http://localhost:3000), sign in with a configured Supabase Auth account, and open `/medi-clinic`.

## Family Clinic dashboard

- `/medi-clinic` is protected by the same Supabase sign-in middleware as `/dashboard`; `/dashboard` continues to show the original billing dashboard for authenticated users.
- The **Family Clinic** navigation link opens `/clinic-login`; signing in there returns to `/medi-clinic`. Unauthenticated clinic links use this clinic-specific login page.
- Patient records and patient-management pages appear only in the Family Clinic dashboard. Legacy `/dashboard/patients` URLs redirect to `/medi-clinic/patients`, and `/dashboard/chart-check` redirects to the clinic overview.
- The first chart counts patients by creation month for the current and previous five calendar months. The second chart counts this month's appointments by `booked`, `done`, and `no_show`, joined to their patients.
- `/medi-clinic/patients` and `/medi-clinic/appointments` support create and edit for owner/front-desk staff. Provider-based bookings require an active provider, appointment type, and matching weekly shift. SQL functions enforce provider time conflicts and daily appointment caps.
- Owners and administrators can change when a provider is available on `/medi-clinic/shifts`: open "Change availability" under a provider, tick the days they work, set the hours for each day (or use "Set Monday to Friday, 08:00-17:00") and save. Changes are saved in one step through `set_provider_availability`, and a day with split shifts is left as it is.
- Shifts are created as a day range: choosing Monday to Friday adds one shift per day and skips days that already exist.
- `/medi-clinic/treatments` is owner-only. `/medi-clinic/tomorrow` lists booked appointments for the next calendar day, including patient phone numbers.
- Owners can configure providers, specialties, time zones, appointment types/durations, shifts, and availability blocks at `/medi-clinic/providers`.
- `/medi-clinic/portal` is for accounts with the trusted `patient` role and a linked patient record. Linked patients can book from configured provider shifts and appointment types.
- Patients can create an account from `/clinic-register` (also reachable from clinic sign-in; the old `/medi-clinic/register` URL redirects there). The signup trigger creates a linked patient profile and grants the trusted patient role immediately; patients land in their own portal at `/medi-clinic/portal`. Clinic staff continue to receive access only through trusted staff-role provisioning. Doctors see patients through their assigned appointments; pharmacists see patients with prescription records. Stock managers manage inventory without patient-chart access.
- Documents are uploaded to a private bucket at `/medi-clinic/documents`; authorized patients receive short-lived signed links in their portal. Configure and test the storage policies before uploading real documents.
- Doctor accounts see a pop-up to pick a doctor (stored in an httpOnly cookie, cleared at sign-in and sign-out), then that doctor's dashboard at `/medi-clinic`, plus `/medi-clinic/appointments`, `/medi-clinic/shifts` and `/medi-clinic/patients` filtered to that doctor. Use "Switch" in the header to change doctor.
- Doctors linked to a provider can draft/sign encounter notes, append addenda, and issue prescriptions. Pharmacists can mark issued prescriptions dispensed; stock managers can register inventory items and batches. Inventory is not yet decremented on dispensing.
- `/medi-clinic/payments` supports staff entry of in-person payments only. No online gateway, automated invoice delivery, or wallet credit/refund action is configured. Wallet rows are a ledger foundation, not a patient-accessible payment method or withdrawable balance.
- `/medi-clinic/portal` accepts non-urgent support requests; reception staff can triage them at `/medi-clinic/enquiries`. It is not live chat or an emergency channel.
- RLS and server-side role checks are authoritative; hiding a link or form is not an access-control boundary. Apply the clinic SQL migrations in order and test each role with normal authenticated application sessions. Do not use SQL Editor queries to prove application access rules; they run with elevated database privileges.
- Applying `clinic-platform.sql` disables hard deletion of patient, appointment, and treatment rows. Patient records can be archived; clinical and financial history should not be erased.
- If appointment booking fails, inspect the displayed Supabase error and confirm all migrations through `clinic-platform.sql` have been applied, the provider and appointment type are active, a matching shift exists in the provider time zone, and the patient belongs to the clinic.

The encounter, payment, wallet, pharmacy, and storage schema additions are operational foundations and are not a certification of compliance. Have clinic counsel/privacy officers review retention, patient rights, and regulated workflows before using real clinical data. Payment processing, email/SMS delivery, drug interaction checks, stock decrement/reconciliation, and audited record exports are not implemented.

Verify roles by signing in as the configured owner, front-desk, doctor, patient, pharmacist, and stock-manager accounts. Confirm each role sees only its assigned pages and that direct server actions and database queries are denied when unauthorized.

To seed test data, run the seed insert in [`supabase/patients.sql`](./supabase/patients.sql) in the Supabase SQL Editor. It inserts 30 sample patients owned by the configured test-user UID. Change that UUID if the test user changes and run the seed only once.

## Entry pages and patient portal features

- `/` landing page with three dashboard cards (Family Clinic, Next.js, Medical Aid), `/clinic-login` (sign in), `/clinic-register` (Create user), `/clinic-hub` and `/nextjs-hub` (choose which dashboard to open). The Family Clinic pages use the navy/blue logo palette.
- The patient portal at `/medi-clinic/portal` is organised into tabs with dashboard-style stat cards:
  - **Online booking:** patients book from active provider shifts and appointment types.
  - **Card wallet:** patients save several payment cards (stored as masked details only: brand, last four digits, expiry, holder) and pick a default for clinic credit. Real card numbers and CVV are never stored, and no online gateway is connected.
  - **Family Care plans:** the clinic's own medical aid promotion with perks and plan comparison. "Enquire about..." sends the patient to the Care Plans area below. Once a patient has joined, the Medical aid tab shows their plan, status, card, recent payments and sample plan PDFs, alongside the provider-based medical aid panel.
  - **Documents:** patients upload PDF, JPEG or PNG files (max 10 MB) in the identity, clinical history or invoices categories to the private `patients-medical-records` bucket, and open them through short-lived signed links.
- **Care Plans (`/medical-aid`):** a separate dashboard with its own landing page (sign up, plans, questions and answers), `/medical-aid/login` and `/medical-aid/register` (the same Supabase accounts as the clinic portal), and `/medical-aid/dashboard` for patients to join a plan, save cards, choose which saved card the plan is paid from, see payments and open sample PDFs (served from `public/care-plans`). **No payment gateway is connected:** joining records a clearly labelled demo payment and no money moves. Card numbers and CVV are never stored.
- The admin dashboard loads each panel independently; if one query fails (for example because of an RLS or clock-skew problem) an amber banner explains it instead of crashing the page.

### Supabase SQL run order

Run these in the Supabase SQL Editor, in order, after the base schema files above:

1. `supabase/clinic-platform.sql`
2. `supabase/clinic-medical-aid.sql`
3. `supabase/fix-patients-rls-recursion.sql` (fixes "infinite recursion detected in policy for relation patients")
4. `supabase/clinic-patient-booking-seed.sql` (assumes the owner account has `clinic_role = 'owner'`)
5. `supabase/clinic-saved-cards.sql`
6. `supabase/clinic-patient-documents-upload.sql`
7. `supabase/clinic-care-plans.sql` (Care Plans: plans, memberships, demo payments and the secure join/change-card/cancel functions; run after `clinic-saved-cards.sql`)
8. `supabase/clinic-demo-data.sql` (optional: Monday to Friday shifts, sample patients and appointments for the existing "Dr. Sample ..." providers; assumes an owner account exists)
9. `supabase/clinic-invoices.sql` (lets patients and front desk read the services on appointments so appointment invoices work; optional but needed for patient appointment invoices)
10. `supabase/clinic-admin-availability.sql` (lets the owner and administrators change when providers are available from the Provider shifts page)
11. `supabase/clinic-sample-doctors-only.sql` (optional clean-up: removes every provider that is not a "Dr. Sample ..." provider, or hides it if it has history)
12. `supabase/clinic-claims.sql` (medical aid claim tracking: table, row-level security, `submit_claim` and `set_claim_status` functions, and five sample claims while the table is empty; run after `clinic-care-plans.sql`)
13. `supabase/clinic-patient-profile.sql` (lets a patient edit their own name, phone, email and date of birth through `update_my_profile`)
14. `supabase/clinic-realtime.sql` (turns on live updates for appointments, Care Plan payments and memberships, and claims; run after `clinic-claims.sql`)

The app still loads if steps 7 and 8 have not been run: the Care Plans pages show a setup notice and the doctor dashboards fall back to clearly labelled sample data. Likewise the Claims screens and the profile form show a plain "run this SQL file" message until steps 12 and 13 are run, and live updates simply stay off until step 14.

### Known issues

- "JWT issued at future" errors come from clock skew between the machine and Supabase; sync the system clock.
- `/medi-clinic/treatments` is owner-only and may fail for admin accounts.
- If Create user fails, check the Supabase signup trigger and the exact error shown.

## Useful commands

```bash
npm run dev     # Start the development server
npm run build   # Create and type-check a production build
npm run start   # Serve a production build
```

## Project map

```text
app/
  medi-clinic/          Separate family clinic dashboard and CRUD routes
  medical-aid/          Care Plans landing page, login/register and patient dashboard
  dashboard/
    (overview)/          Dashboard overview
    customers/           Customer view
    invoices/            Invoice list and create/edit routes
  lib/
    actions.ts           Invoice actions and Supabase sign-in/out
    data.ts              Invoice/customer queries
    supabase/server.ts   Cookie-backed Supabase server client
  ui/
    dashboard/           Dashboard layout and navigation
    invoices/            Invoice components and forms
middleware.ts             Refreshes Supabase sessions and protects dashboard routes
supabase/patients.sql     Patient table for the Family Clinic dashboard
supabase/medi-clinic.sql  Appointment/treatment schema and role-based RLS
supabase/clinic-scheduling.sql  Providers, shifts, appointment types, booking rules
supabase/clinic-platform.sql    Portal, private records, clinical, payment and pharmacy foundations
supabase/clinic-medical-aid.sql Medical aid and Family Care plans
supabase/fix-patients-rls-recursion.sql  Fixes recursive patients RLS policy
supabase/clinic-patient-booking-seed.sql Booking seed data
supabase/clinic-saved-cards.sql Saved card wallet
supabase/clinic-patient-documents-upload.sql Patient document upload policies
supabase/clinic-care-plans.sql Care Plans, memberships and demo payment records
supabase/clinic-demo-data.sql Shifts, patients and appointments for the Dr. Sample providers
supabase/clinic-sample-doctors-only.sql Removes or hides non-sample providers
supabase/clinic-invoices.sql Read access to appointment services for invoices
supabase/clinic-admin-availability.sql Atomic function to change provider availability
supabase/clinic-claims.sql Claim tracking table, functions and sample claims
supabase/clinic-patient-profile.sql Function for patients to edit their own profile
supabase/clinic-realtime.sql Turns on Supabase Realtime for the watched tables
app/ui/
  theme-toggle.tsx, language-toggle.tsx   Dark/light and EN/AF buttons
  header-tools.tsx                        Toolbar: tour, notifications, language, theme
  keyboard-shortcuts.tsx                  Single-key shortcuts and the ? help
  guided-tour.tsx                         Ten-step guided demo tour
  notifications.tsx                       Notification bell and realtime listener
  claim-parts.tsx                         Claim stage tracker, badge and statistics
app/lib/i18n.ts, lang.ts                  English / Afrikaans dictionaries and helpers
app/lib/claims.ts                         Claim stage rules
app/medi-clinic/calendar, claims          Appointment calendar and claims board (staff)
```

## Chart hover cards

Every chart in every dashboard shows a card with its statistics when the user hovers over it, focuses it with the keyboard or taps it, for all roles (`app/ui/chart-hover.tsx`):

- Family Clinic overview (owner, admin, front desk): the new patients bars show the month's count, the change from the previous month and the share of the six months; the appointment outcomes donut shows each status's count, its share of the month and the month total.
- Doctor dashboard: a new "Appointments by day" chart for the current week, with booked, completed, no-show and day totals.
- Medical Aid dashboard: a new "Paid by month" chart of Care Plan payments, with the amount, number of payments and plan.
- Next.js dashboard: the revenue chart shows the month's revenue, the change from the previous month and its share of the year.

Charts stay server components: each bar or segment carries a `data-tip` description and the shared `ChartHoverArea` draws the card.

## Dark and light mode

The moon / sun button in every header switches the whole app between light and dark. The choice is saved in the browser and applied before the page paints, so there is no flash. Dark mode works by remapping the dashboards' fixed colours in `app/ui/global.css` (under `html.dark`), so new pages that use the same palette are covered automatically. Press `T` to toggle it from the keyboard.

## Languages

The language button switches between English and Afrikaans (stored in a `lang` cookie, with the page language set on `<html>`). Dictionaries are in `app/lib/i18n.ts`; server pages use `getT()` (`app/lib/lang.ts`) and client components use `useT()`. Currently translated: the toolbar, navigation, headers, landing cards, doctor dashboard, calendar, claims, plan progress, patient profile, notifications, keyboard help and the guided tour. Other page text is still English and can be added key by key. Press `L` to switch language.

## Guided demo tour

A ten-step tour explains the three dashboards, the roles, a doctor's day, running the clinic, the patient view, Medical Aid plans and claims, and live updates and shortcuts. It opens from the sparkle button in any header (or Search > Take the tour), appears as a small card that never blocks the page, highlights the toolbar and bell where relevant, and offers links to the pages it describes. First-time visitors to the home page get a one-time prompt. Use the arrow keys, Back / Next, or Esc. It is available in English and Afrikaans.

## Keyboard shortcuts

Single-key shortcuts work anywhere except while typing in a field. Press `?` for the list:

| Keys | Action |
| --- | --- |
| `?` | Show shortcuts |
| `T` / `L` | Toggle theme / language |
| `G` then `O`, `P`, `A`, `C`, `S`, `M`, `H` | Go to Overview, Patients, Appointments, Calendar, Shifts, Medical Aid, Home |
| `Esc` | Close |

The `G` jumps only go to pages your role has in its navigation bar.

## Live updates and notifications

When a signed-in user is on a page, the app subscribes to Supabase Realtime for appointments, Care Plan payments and memberships, and claims. Any change refreshes the page by itself and adds an entry to the bell (with an unread count, mark-all-read, clear, and a green dot while live). Row-level security decides which changes each user receives. Run `supabase/clinic-realtime.sql` once to switch it on; without it the app works as before. Notifications are kept in the browser only.

## Appointment calendar

`/medi-clinic/calendar` (owner, admin, front desk and doctor) shows a Monday to Sunday week in the clinic's time zone, colour-coded booked / done / no-show, with today highlighted and a hover card per appointment. Choosing one doctor (and for doctors, their own schedule) shows a time grid with their available hours shaded. "All doctors" shows each day as a list of cards in time order, with the full patient name, time, visit type and doctor, so nothing is cut off when several doctors are busy at the same hour. Previous, Today and Next move between weeks.

## Care Plan progress and payments

The Medical Aid overview shows the first 12 months of the plan as a progress bar, the next payment date with days remaining (or overdue), the total paid and a 12-month schedule: recorded payments are marked Paid (or Failed / Refunded), and later months are projected from the next debit date and the plan price, labelled Upcoming.

## Medical aid claims

Patients submit a claim (what it was for and the amount) from the Claims tab of the Medical Aid dashboard and follow it through Submitted, In review, Approved or Rejected, and Paid with a stage tracker. Owner, admin and front desk use the Claims board at `/medi-clinic/claims` to move claims one allowed step at a time (with an optional reason), and see open claims, approval rate, total claimed and total paid. The allowed moves and who may make them are enforced in the database (`set_claim_status`), not in the browser.

## Patient profile

Patients edit their own name, phone, email and date of birth from the "My profile" tab of the portal (`update_my_profile`). The function only changes the signed-in patient's own row and validates every field; staff-managed fields such as the patient number cannot be changed.

## Navigation and polish

- Back, forward and refresh arrows (like the browser's) appear on every login and sign-up page, each hub page and inside each dashboard (`app/ui/history-nav.tsx`). If there is no earlier page, Back goes to that area's home.
- Branded 404 page (`app/not-found.tsx`), favicon (`app/icon.svg`), page title and description for the whole app, theme colour, smooth scrolling, visible keyboard focus, aligned table numbers and reduced-motion support (`app/ui/global.css`).
- The landing page shows the three dashboard cards with a short trust strip (role-based access, private documents, demo payments only).

## Invoices

PDF invoices are generated automatically on request, in the clinic's invoice layout (header, billing details, services table, total), with no extra packages:

- Care Plan payments: "Download PDF" in the Care Plans payments table (`/medi-clinic/invoices/care-plan/[id]`).
- Recorded payments: "Invoice" in the patient portal and "PDF" in the staff payments register (`/medi-clinic/invoices/payment/[id]`).
- Appointments: "Invoice (PDF)" in the patient portal and staff appointment list (`/medi-clinic/invoices/appointment/[id]`), built from the services recorded for the appointment. It shows Unpaid until paid payments cover the total, and returns a clear message when no services are recorded yet.

Invoice numbers come from the record date and id (for example `INV-CP-20261012-3F9A2C`), so a record always has the same number. Access follows row-level security, so patients only get their own invoices.

## Presentations and proposals

- Proposals: [`proposal.md`](./proposal.md) (Next.js billing dashboard), [`family-clinic/proposal.md`](./family-clinic/proposal.md) (Family Clinic) and [`medical-aid/proposal.md`](./medical-aid/proposal.md) (Care Plans).
- Presentations (PDF) are in [`presentations/`](./presentations): the full walkthrough [`family-clinic-platform-walkthrough.pdf`](./presentations/family-clinic-platform-walkthrough.pdf) (15 slides, speaker notes, likely questions and an 8-minute live demo order), and the speech [`walkthrough-speech.md`](./presentations/walkthrough-speech.md) (also as PDF), plus short 60-second decks for the billing dashboard, Family Clinic and Medical Aid, and the colour and font guide.

## Deployment

Vercel deploys the `main` branch to production. Merge work into `main` to publish it; other branches get preview deployments only.

## Important notes

- The application uses Supabase for authentication and Family Clinic data, and PostgreSQL through `POSTGRES_URL` for invoice/customer data.
- The RLS script is intended for a new patients table. If the table or policies already exist, review the SQL and adjust it before running it again.
- Configure production environment variables in your hosting provider before deploying. Never commit `.env.local`, service-role keys, database passwords, or other secrets.
