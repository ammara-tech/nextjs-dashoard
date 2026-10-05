## Next.js App Router Course - Final

This is the final template for the Next.js App Router Course. It contains the final code for the dashboard application.

For more information, see the [course curriculum](https://nextjs.org/learn) on the Next.js Website.

## Patient records

Patient sign-in and data access use Supabase Auth so the database can enforce
the row-level security (RLS) policies. Add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project to `.env.local`, then
create your test accounts under **Authentication → Users** in Supabase.

Run [`supabase/patients.sql`](./supabase/patients.sql) in the Supabase SQL
Editor to create the patients table, enable RLS, grant authenticated access,
and install the owner-only policies. The SQL Editor runs with elevated access;
use the application while signed in as separate Supabase users to verify that
each user sees only their own patient records.

The invoice and customer features continue to use the existing Postgres
connection configured with `POSTGRES_URL`.
