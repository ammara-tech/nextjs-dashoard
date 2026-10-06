# Patient and Billing Dashboard

A Next.js dashboard for managing invoices, customers, and patient records. Patient records are accessed through Supabase Auth and protected by database row-level security (RLS), so an authenticated user can access only records associated with their account.

## Features

- Sign in with Supabase Auth.
- View the dashboard overview, revenue, and latest invoices.
- Browse customers and search/filter invoices.
- Create, list, edit, and delete patient records.
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

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), sign in with a Supabase Auth account, and use **Patients** in the dashboard navigation.

## Patient data security

Patient operations use the cookie-backed Supabase server client in `lib/supabase/server.ts`. The app does not send a `user_id` when creating a patient: the database fills it from `auth.uid()`. RLS policies restrict reads and writes to the signed-in user's rows.

To verify ownership, sign in as two different Supabase Auth users. Each account should see only its own patients. A user's attempt to open another user's patient edit URL should display the not-found page. Do not use the Supabase SQL Editor to prove the app's access rules: SQL Editor queries run with elevated database privileges and do not represent a normal signed-in application request.

To seed test data, copy user one's UID from **Authentication → Users** and run this in the Supabase SQL Editor, replacing the example UUID with that user's UID:

```sql
insert into patients (user_id, full_name, phone, date_of_birth, created_at)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Patient ' || g,
  '082' || lpad(floor(random() * 10000000)::int::text, 7, '0'),
  date '1960-01-01' + floor(random() * 20000)::int,
  now() - (random() * interval '180 days')
from generate_series(1, 30) as g;
```

## Chart one

- **Question:** Is the practice growing? New patients per month
- **Who acts:** the owner decides whether to open a second consulting day
- **Shape:** bar, one per month, last 6 months
- **View:** `patients_per_month` (`month_start`, `label`, `new_patients`) — with (`security_invoker = true`)

The view is created in `supabase/patients.sql`. It includes all six calendar months, including months with zero patients. Its invoker security keeps the patients table's RLS policies active. After applying the SQL, visit `/dashboard/chart-check` while signed in as each test user; user one's monthly counts should be visible and user two should receive an empty result when they own no patients.

## Useful commands

```bash
npm run dev     # Start the development server
npm run build   # Create and type-check a production build
npm run start   # Serve a production build
```

## Project map

```text
app/
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
```

## Important notes

- The application uses two data services: Supabase for authentication and patient records, and PostgreSQL through `POSTGRES_URL` for invoice/customer data.
- The RLS script is intended for a new patients table. If the table or policies already exist, review the SQL and adjust it before running it again.
- Configure production environment variables in your hosting provider before deploying. Never commit `.env.local`, service-role keys, database passwords, or other secrets.
