# Next.js Patient and Billing Dashboard

**Deployed base:** https://nextjs-dashoard-psi.vercel.app

**Repository:** https://github.com/ammara-tech/nextjs-dashoard

**Student:** Ammara Badat

## 1. Executive summary

This project is a web dashboard for reviewing billing and customer activity and
managing patient contact records. It is built with the Next.js App Router.
Invoice and customer data use the existing PostgreSQL connection, while
Supabase Auth and PostgreSQL Row Level Security (RLS) protect patient records.

The Family Clinic Dashboard is a separate experience at `/medi-clinic`, with
its own proposal in [`family-clinic/proposal.md`](./family-clinic/proposal.md).

## 2. Problem and opportunity

Teams need a convenient way to review invoices, customers, and revenue, while
staff responsible for patient records need reliable patient contact details.
A single authenticated web application provides access to these workflows
without mixing the billing database access with Supabase-protected patient
records.

The application is an operational dashboard, not a complete electronic health
record, clinical decision-support system, or claim of regulatory compliance.

## 3. Goals

- Provide sign-in and protected access to dashboard features.
- Show invoice, customer, and revenue information in a dashboard overview.
- Support browsing customers and searching/filtering invoices.
- Let authorized users list, create, edit, and delete patient contact records.
- Enforce patient ownership at the database level with Supabase RLS.
- Preserve the billing features backed by the existing PostgreSQL connection.

## 4. Scope

### Included

- Next.js App Router pages and server-rendered dashboard views.
- Authentication using Supabase Auth for protected dashboard access.
- Dashboard overview with billing metrics, revenue, and latest invoices.
- Customer listing and invoice listing, creation, editing, and deletion.
- Patient records with full name, phone, and date of birth.
- Server-side validation for patient create and edit forms.
- Supabase SQL setup for the patients table, ownership key, and RLS policies.

### Not included

- Clinical notes, diagnoses, prescriptions, or laboratory results.
- Online patient appointment booking or reminder messaging.
- Medical aid claims or integration with external billing providers.
- Replacing the current invoice/customer PostgreSQL data source.
- A claim that the system is certified or compliant with healthcare regulations.

## 5. Users and access

- **Authenticated dashboard users:** access dashboard data allowed by their
  account and database policies.
- **Application owner:** configures database services, authentication users,
  deployment settings, and access roles.
- **Unauthenticated visitor:** must sign in before accessing protected
  dashboard routes.

Patient rows are protected by RLS and scoped to the authenticated clinic owner.
The Family Clinic Dashboard defines additional owner and front-desk permissions
in its separate proposal.

## 6. Proposed solution and architecture

### Application

- Next.js App Router serves the dashboard pages and forms.
- React Server Components render database-backed views.
- Server Actions validate and process form submissions.
- Middleware refreshes Supabase sessions and protects dashboard routes.

### Data services

- **Invoices and customers:** PostgreSQL accessed using `POSTGRES_URL`.
- **Authentication and patients:** Supabase Auth, the Supabase SSR client, and
  PostgreSQL RLS.

The separate data services allow the existing billing features to remain
unchanged while the patient feature uses authenticated database requests and
ownership policies.

### Patient data security

- Patient inserts use a database default for `user_id`; the form does not accept
  an owner ID.
- RLS is enabled on the patients table.
- Policies restrict patient reads and changes to clinic-owned records.
- The application uses the signed-in user's session when accessing Supabase.
- Secrets and service-role credentials must remain server-side and outside
  source control.

## 7. Data model

The patient record includes:

| Field | Purpose |
|---|---|
| `id` | Unique patient identifier |
| `user_id` | Clinic owner associated with the record |
| `full_name` | Patient's name |
| `phone` | Contact phone number |
| `date_of_birth` | Patient date of birth |
| `created_at` | Record creation timestamp |

Billing uses the existing invoice and customer tables, and the existing revenue
data source. Patient schema and access policies are maintained in
[`supabase/patients.sql`](./supabase/patients.sql).

## 8. Functional requirements

1. Unauthenticated visitors cannot access protected dashboard routes.
2. An authorized user can review the dashboard overview and its billing data.
3. An authorized user can browse customers and search/filter invoices.
4. An authorized user can create, list, and edit patient contact records.
5. Patient deletes are limited to the clinic owner.
6. A user cannot read or modify patient records outside their clinic, even if
   they know a record's ID.
7. Validation and database failures must be surfaced rather than reported as
   successful operations.
8. Existing invoice/customer routes continue to use the current PostgreSQL
   service.

## 9. Non-functional requirements

- **Security:** use session-bound server requests, least-privilege grants, and
  database-enforced RLS.
- **Privacy:** store only the fields needed for the patient contact workflow.
- **Reliability:** report database failures and avoid success-shaped fallbacks
  for failed writes.
- **Accessibility:** use labelled inputs, validation feedback, and descriptive
  action labels.
- **Maintainability:** keep route, data-access, validation, and UI code
  organized in the existing project structure.

## 10. Delivery and acceptance

1. Configure Supabase and PostgreSQL environment variables.
2. Create test accounts in Supabase Auth and apply the documented database
   setup SQL.
3. Build the application and resolve TypeScript errors.
4. Verify authentication and dashboard route access.
5. Test invoice and customer pages against the existing PostgreSQL service.
6. Test patient CRUD and RLS with separate clinic users.
7. Configure production secrets and deploy.

The project is accepted when the production build passes, protected pages
require authentication, billing routes remain functional, patient operations
follow their RLS rules, and a user cannot access another clinic's records.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Supabase is not configured | Document required environment variables and fail explicitly when configuration is missing. |
| Patient RLS policies are incomplete | Apply the reviewed SQL and test using normal signed-in accounts. |
| Billing and patient data use separate services | Document which service each feature uses and configure both in deployments. |
| Patient data is sensitive | Limit stored fields, enforce RLS, protect credentials, and conduct an appropriate privacy/security review before real-world clinical use. |
| Staff need shared access | Use the explicitly defined Family Clinic roles and policies rather than broad access grants. |

## 12. Project references

- Setup and commands: [`README.md`](./README.md)
- Patient table and base policies: [`supabase/patients.sql`](./supabase/patients.sql)
- Clinic schema and role-based policies:
  [`supabase/medi-clinic.sql`](./supabase/medi-clinic.sql)
- Next.js dashboard: [`app/dashboard`](./app/dashboard)
- Separate Family Clinic proposal:
  [`family-clinic/proposal.md`](./family-clinic/proposal.md)
