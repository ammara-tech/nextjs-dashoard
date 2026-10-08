# Patient and Billing Dashboard

A Next.js application with the original invoice/customer dashboard and a separate family clinic dashboard. Patient and clinic data are managed only from the family clinic area.

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
- Open the family clinic dashboard at `/medi-clinic` with owner/front-desk access.
- Manage appointments and owner-only treatments, review the two clinic charts, and view tomorrow's booked appointments with patient phone numbers.
- Enforce patient ownership in PostgreSQL with Supabase RLS policies.
- Keep the invoice and customer data layer backed by the existing `POSTGRES_URL` connection.

## Technology

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
- `/medi-clinic/treatments` is owner-only. `/medi-clinic/tomorrow` lists booked appointments for the next calendar day, including patient phone numbers.
- Owners can configure providers, specialties, time zones, appointment types/durations, shifts, and availability blocks at `/medi-clinic/providers`.
- `/medi-clinic/portal` is for accounts with the trusted `patient` role and a linked patient record. Linked patients can book from configured provider shifts and appointment types.
- Patients can create an account from `/clinic-register` (also reachable from clinic sign-in; the old `/medi-clinic/register` URL redirects there). The signup trigger creates a linked patient profile and grants the trusted patient role immediately; patients land in their own portal at `/medi-clinic/portal`. Clinic staff continue to receive access only through trusted staff-role provisioning. Doctors see patients through their assigned appointments; pharmacists see patients with prescription records. Stock managers manage inventory without patient-chart access.
- Documents are uploaded to a private bucket at `/medi-clinic/documents`; authorized patients receive short-lived signed links in their portal. Configure and test the storage policies before uploading real documents.
- Doctors linked to a provider can draft/sign encounter notes, append addenda, and issue prescriptions. Pharmacists can mark issued prescriptions dispensed; stock managers can register inventory items and batches. Inventory is not yet decremented on dispensing.
- `/medi-clinic/payments` supports staff entry of in-person payments only. No online gateway, automated invoice delivery, or wallet credit/refund action is configured. Wallet rows are a ledger foundation, not a patient-accessible payment method or withdrawable balance.
- `/medi-clinic/portal` accepts non-urgent support requests; reception staff can triage them at `/medi-clinic/enquiries`. It is not live chat or an emergency channel.
- RLS and server-side role checks are authoritative; hiding a link or form is not an access-control boundary. Apply the clinic SQL migrations in order and test each role with normal authenticated application sessions. Do not use SQL Editor queries to prove application access rules; they run with elevated database privileges.
- Applying `clinic-platform.sql` disables hard deletion of patient, appointment, and treatment rows. Patient records can be archived; clinical and financial history should not be erased.
- If appointment booking fails, inspect the displayed Supabase error and confirm all migrations through `clinic-platform.sql` have been applied, the provider and appointment type are active, a matching shift exists in the provider time zone, and the patient belongs to the clinic.

The encounter, payment, wallet, pharmacy, and storage schema additions are operational foundations and are not a certification of compliance. Have clinic counsel/privacy officers review retention, patient rights, and regulated workflows before using real clinical data. Payment processing, email/SMS delivery, drug interaction checks, stock decrement/reconciliation, and audited record exports are not implemented.

Verify roles by signing in as the configured owner, front-desk, doctor, patient, pharmacist, and stock-manager accounts. Confirm each role sees only its assigned pages and that direct server actions and database queries are denied when unauthorized.

To seed test data, run the seed insert in [`supabase/patients.sql`](./supabase/patients.sql) in the Supabase SQL Editor. It inserts 30 sample patients owned by the configured test-user UID. Change that UUID if the test user changes and run the seed only once.

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
```

## Important notes

- The application uses Supabase for authentication and Family Clinic data, and PostgreSQL through `POSTGRES_URL` for invoice/customer data.
- The RLS script is intended for a new patients table. If the table or policies already exist, review the SQL and adjust it before running it again.
- Configure production environment variables in your hosting provider before deploying. Never commit `.env.local`, service-role keys, database passwords, or other secrets.
