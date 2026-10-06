# Next.js Billing Dashboard

**Deployed base:** https://nextjs-dashoard-psi.vercel.app

**Repository:** https://github.com/ammara-tech/nextjs-dashoard

**Student:** Ammara Badat

## 1. Executive summary

This project is a web dashboard for reviewing billing, customer, and revenue
activity. It is built with the Next.js App Router, with invoice and customer
data using the existing PostgreSQL connection.

The Family Clinic Dashboard is a separate experience at `/medi-clinic`, with
its own proposal in [`family-clinic/proposal.md`](./family-clinic/proposal.md).

## 2. Problem and opportunity

Teams need a convenient way to review invoices, customers, and revenue. The
billing dashboard keeps those workflows together without mixing them with the
separate clinic patient and appointment system.

The application is an operational dashboard, not a complete electronic health
record, clinical decision-support system, or claim of regulatory compliance.

## 3. Goals

- Provide sign-in and protected access to dashboard features.
- Show invoice, customer, and revenue information in a dashboard overview.
- Support browsing customers and searching/filtering invoices.
- Preserve the billing features backed by the existing PostgreSQL connection.
- Keep patient and clinic management exclusively in the Family Clinic
  Dashboard.

## 4. Scope

### Included

- Next.js App Router pages and server-rendered dashboard views.
- Authentication using Supabase Auth for protected dashboard access.
- Dashboard overview with billing metrics, revenue, and latest invoices.
- Customer listing and invoice listing, creation, editing, and deletion.

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

Patient records do not appear in this dashboard. Owner and front-desk access
to patient, appointment, and treatment data is defined in the separate Family
Clinic proposal.

## 6. Proposed solution and architecture

### Application

- Next.js App Router serves the dashboard pages and forms.
- React Server Components render database-backed views.
- Server Actions validate and process form submissions.
- Middleware refreshes Supabase sessions and protects dashboard routes.

### Data services

- **Invoices and customers:** PostgreSQL accessed using `POSTGRES_URL`.
- **Authentication:** Supabase Auth protects application routes.

The billing dashboard continues to use the existing invoice, customer, and
revenue data sources. Clinic entities and policies are documented in the
separate Family Clinic proposal.

## 8. Functional requirements

1. Unauthenticated visitors cannot access protected dashboard routes.
2. An authorized user can review the dashboard overview and its billing data.
3. An authorized user can browse customers and search/filter invoices.
4. Patient management is available only through the Family Clinic Dashboard.
5. Legacy patient page URLs redirect to the Family Clinic patient list.
6. Validation and database failures must be surfaced rather than reported as
   successful operations.
7. Invoice/customer routes continue to use the current PostgreSQL
   service.

## 9. Non-functional requirements

- **Security:** protect authenticated routes and keep database credentials
  server-side.
- **Privacy:** do not expose clinic patient records in the billing dashboard.
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
6. Confirm patient management is available only through `/medi-clinic`.
7. Configure production secrets and deploy.

The project is accepted when the production build passes, protected pages
require authentication, billing routes remain functional, and patient
management is available only through the Family Clinic Dashboard.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Supabase is not configured | Document required environment variables and fail explicitly when configuration is missing. |
| Billing and patient data use separate services | Document which service each feature uses and configure both in deployments. |
| Clinic data is sensitive | Refer to the Family Clinic proposal for its RLS and role-based access requirements. |

## 12. Project references

- Setup and commands: [`README.md`](./README.md)
- Next.js dashboard: [`app/dashboard`](./app/dashboard)
- Separate Family Clinic proposal:
  [`family-clinic/proposal.md`](./family-clinic/proposal.md)
