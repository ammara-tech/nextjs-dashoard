# Patient and Billing Dashboard

A Next.js application with the original invoice/customer dashboard and a separate family clinic dashboard. Supabase Auth and database row-level security (RLS) protect patient and clinic data.

The app also includes a separate family practice dashboard at `/medi-clinic`. It manages patients, appointments, and treatments; shows patient growth and appointment outcomes; and includes a tomorrow appointment list.

## Features

- Sign in with Supabase Auth.
- View the dashboard overview, revenue, and latest invoices.
- Browse customers and search/filter invoices.
- Create, list, edit, and delete patient records.
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

3. In the Supabase dashboard, create the accounts that will sign in to the application under **Authentication → Users**.

4. Run [`supabase/patients.sql`](./supabase/patients.sql) in the Supabase SQL Editor. It creates the patient table, enables RLS, grants authenticated access, adds owner-only policies, and creates an index on `user_id`.

5. Run [`supabase/medi-clinic.sql`](./supabase/medi-clinic.sql) after `patients.sql`. It adds appointments and treatments, updates patient ownership policies for the shared clinic, and limits deletes and treatments to the owner.

6. Set the trusted Supabase Auth `app_metadata` for each clinic account using the Supabase Admin API from a secure server-side environment. Never expose the service-role key in the browser or commit it.

   - Owner: `{ "clinic_role": "owner" }`
   - Front desk: `{ "clinic_role": "front_desk", "clinic_owner_id": "<owner-auth-user-uuid>" }`

   The owner ID defaults to the signed-in user's ID for the owner account. Front-desk users must point to that same owner ID to share the practice's records. Accounts without a `clinic_role` are treated as front desk; they cannot view or change treatments or delete records.

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000), sign in with a configured Supabase Auth account, and open `/medi-clinic`.

## Patient data security

Patient operations use the cookie-backed Supabase server client in `lib/supabase/server.ts`. The app does not send a `user_id` when creating a patient: the database fills it from the authenticated clinic owner claim. RLS restricts access to the clinic's rows and enforces role-specific changes.

Verify roles by signing in once as the configured owner and once as a front-desk user. The owner should see all clinic areas and have delete/treatment actions; front desk should see only patients, appointments, and tomorrow's booked list. Do not use the Supabase SQL Editor to prove the app's access rules: SQL Editor queries run with elevated database privileges and do not represent a normal signed-in application request.

To seed test data for user one, run the seed insert in [`supabase/patients.sql`](./supabase/patients.sql) in the Supabase SQL Editor. It inserts 30 sample patients owned by the configured test-user UID. Change that UUID in the script if your test user changes. Run the seed insert only once; each run creates another 30 rows.

## Chart one

- **Question:** Is the practice growing? New patients per month
- **Who acts:** the owner decides whether to open a second consulting day
- **Shape:** bar, one per month, last 6 months
- **View:** `patients_per_month` (`month_start`, `label`, `new_patients`) — with (`security_invoker = true`)

The view is created in `supabase/patients.sql`. It includes all six calendar months, including months with zero patients. Its invoker security keeps the patients table's RLS policies active. After applying the SQL, visit `/dashboard/chart-check` while signed in as each test user; user one's monthly counts should be visible and user two should receive an empty result when they own no patients.

## Family Clinic dashboard

- `/medi-clinic` is protected by the same Supabase sign-in middleware as `/dashboard`. Front-desk users are sent to the clinic app instead of the legacy billing dashboard.
- The first chart counts patients by creation month for the current and previous five calendar months. The second chart counts this month's appointments by `booked`, `done`, and `no_show`, joined to their patients.
- `/medi-clinic/patients` and `/medi-clinic/appointments` support create and edit for both roles. Only the owner can delete records.
- `/medi-clinic/treatments` is owner-only. `/medi-clinic/tomorrow` lists booked appointments for the next calendar day, including patient phone numbers.
- The database policies in `supabase/medi-clinic.sql` are authoritative. UI visibility is not used as an access-control boundary.

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
    patients/            Patient list and create/edit routes
  lib/
    actions.ts           Invoice actions, patient actions, and Supabase sign-in/out
    data.ts              Invoice/customer queries and patient reads
    supabase/server.ts   Cookie-backed Supabase server client
    chart-check/         Temporary RLS check for the monthly patients view
  ui/
    dashboard/           Dashboard layout and navigation
    invoices/            Invoice components and forms
    patients/            Patient buttons and forms
middleware.ts             Refreshes Supabase sessions and protects dashboard routes
supabase/patients.sql     Patient table, grants, index, and RLS policies
supabase/medi-clinic.sql  Appointment/treatment schema and role-based RLS
```

## Important notes

- The application uses two data services: Supabase for authentication and patient records, and PostgreSQL through `POSTGRES_URL` for invoice/customer data.
- The RLS script is intended for a new patients table. If the table or policies already exist, review the SQL and adjust it before running it again.
- Configure production environment variables in your hosting provider before deploying. Never commit `.env.local`, service-role keys, database passwords, or other secrets.
