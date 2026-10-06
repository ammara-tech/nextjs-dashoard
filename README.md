# Patient and Billing Dashboard

A Next.js application with the original invoice/customer dashboard and a separate family clinic dashboard. Patient and clinic data are managed only from the family clinic area.

The app also includes a separate family practice dashboard at `/medi-clinic`. It manages patients, appointments, and treatments; shows patient growth and appointment outcomes; and includes a tomorrow appointment list.

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

## Family Clinic dashboard

- `/medi-clinic` is protected by the same Supabase sign-in middleware as `/dashboard`; `/dashboard` continues to show the original billing dashboard for authenticated users.
- The **Family Clinic** navigation link opens `/clinic-login`; signing in there returns to `/medi-clinic`. Unauthenticated clinic links use this clinic-specific login page.
- Patient records and patient-management pages appear only in the Family Clinic dashboard. Legacy `/dashboard/patients` URLs redirect to `/medi-clinic/patients`, and `/dashboard/chart-check` redirects to the clinic overview.
- The first chart counts patients by creation month for the current and previous five calendar months. The second chart counts this month's appointments by `booked`, `done`, and `no_show`, joined to their patients.
- `/medi-clinic/patients` and `/medi-clinic/appointments` support create and edit for both roles. Only the owner can delete records.
- `/medi-clinic/treatments` is owner-only. `/medi-clinic/tomorrow` lists booked appointments for the next calendar day, including patient phone numbers.
- The database policies in `supabase/medi-clinic.sql` are authoritative. UI visibility is not used as an access-control boundary.
- If appointment booking fails, the form displays the Supabase error and code. Confirm `supabase/patients.sql` and then `supabase/medi-clinic.sql` have been applied, and that the selected patient belongs to the signed-in clinic.

Verify roles by signing in as the configured owner and as a front-desk user. The owner should see all clinic areas and have delete/treatment actions; front desk should see only patients, appointments, and tomorrow's booked list. Do not use the Supabase SQL Editor to prove application access rules; SQL Editor queries run with elevated database privileges.

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
```

## Important notes

- The application uses Supabase for authentication and Family Clinic data, and PostgreSQL through `POSTGRES_URL` for invoice/customer data.
- The RLS script is intended for a new patients table. If the table or policies already exist, review the SQL and adjust it before running it again.
- Configure production environment variables in your hosting provider before deploying. Never commit `.env.local`, service-role keys, database passwords, or other secrets.
