# Project Proposal: Patient and Billing Dashboard

## 1. Executive summary

This project provides a web dashboard for invoice, customer, and patient-record workflows. It builds on the existing Next.js dashboard and adds create, read, update, and delete (CRUD) operations for patient records. Patient sign-in and patient data access use Supabase so PostgreSQL row-level security (RLS) can enforce that users see and change only their own records.

The existing invoice and customer features continue to use the project's PostgreSQL connection. Patient access is deliberately isolated behind a cookie-backed Supabase server client, which carries the signed-in user's session to the database.

## 2. Problem and opportunity

Small practices and service teams need a straightforward place to review operational data and maintain basic patient contact records. A dashboard can make common record-management tasks easier to find and complete while applying database-level ownership rules rather than relying only on interface checks.

This application is a starting point for those workflows. It is not a complete electronic health record (EHR), clinical decision-support system, or claim of regulatory compliance.

## 3. Goals

- Provide authenticated access to the dashboard.
- Let an authenticated user list, create, edit, and delete their patient records.
- Enforce patient ownership in the database through RLS.
- Show a not-found response when a user requests a patient record that is not visible to them.
- Preserve and continue supporting the existing invoice, customer, and dashboard overview features.
- Document how to configure, run, and verify the application.

## 4. Scope

### Included

- Supabase Auth-based sign-in and sign-out for the dashboard.
- A patients list with full name, phone, and date of birth.
- Patient create and edit forms with server-side validation.
- Patient delete actions.
- A Supabase SQL setup script with table definition, grants, RLS policies, and a `user_id` index.
- Owner-only RLS policies for selecting, inserting, updating, and deleting patient rows.
- Existing invoice, customer, and dashboard overview functionality.

### Not included in the current scope

- Clinical notes, diagnoses, prescriptions, lab results, or document storage.
- Shared practice-wide patient access or staff/owner role management.
- Patient self-service accounts, appointment scheduling, billing integration, or notifications.
- Migration of the existing invoice/customer data into Supabase.
- A claim that the application is certified or compliant with HIPAA or other healthcare regulations.

## 5. Users and access model

- **Authenticated application user:** signs in through Supabase Auth and can access only their own patient rows.
- **Application administrator/project owner:** configures Supabase, manages authentication accounts, applies database SQL, and configures deployment secrets.
- **Unauthenticated visitor:** is redirected away from dashboard routes to the login page.

The current ownership model is intentionally simple: a patient row belongs to the Supabase user identified by `user_id`. Broader staff access should be designed and reviewed separately rather than weakening the baseline policies.

## 6. Proposed solution and architecture

### Web application

- Next.js App Router provides server-rendered dashboard routes and forms.
- Server Actions validate patient form data and call Supabase for mutations.
- Middleware refreshes Supabase session cookies and protects dashboard routes.
- The patient edit route treats a record hidden by RLS as not found.

### Data services

- **Patients and authentication:** Supabase Auth, the Supabase SSR client, and PostgreSQL RLS.
- **Invoices and customers:** the existing PostgreSQL database accessed using `POSTGRES_URL`.

Keeping these services separate allows the patient feature to apply Supabase user claims and RLS without rewriting the existing invoice/customer implementation.

### Patient security rules

- `user_id` defaults to `auth.uid()` at insert time; the application does not accept an owner ID from the form.
- RLS is enabled on the patients table.
- Authenticated users receive only the required table grants.
- Separate policies restrict select, insert, update, and delete operations to rows owned by the current user.
- An index on `user_id` supports the ownership filters.

## 7. Data model

The initial patient record contains:

| Field | Purpose |
|---|---|
| `id` | Unique patient-row identifier |
| `user_id` | Supabase Auth user who owns the record |
| `full_name` | Required patient name |
| `phone` | Optional contact number |
| `date_of_birth` | Optional date of birth |
| `created_at` | Record creation timestamp |

The database definition and RLS policies are maintained in [`supabase/patients.sql`](./supabase/patients.sql).

## 8. Functional requirements

1. Visitors must authenticate before accessing dashboard routes.
2. A signed-in user can view a list of their visible patients.
3. A signed-in user can create a patient with a required full name and optional phone/date of birth.
4. A signed-in user can edit a patient they own.
5. A signed-in user can delete a patient they own.
6. A user cannot read or modify another user's patient row, even when they know its ID.
7. Invalid form input and database errors must be surfaced through the relevant form or route error handling.
8. Invoice and customer features must continue to use their current PostgreSQL data source.

## 9. Non-functional requirements

- **Security:** use server-side Supabase access, session-bound requests, least-privilege grants, and database-enforced RLS.
- **Privacy:** collect only the patient fields currently required by the workflow; protect credentials and environment variables.
- **Reliability:** database failures should be reported rather than appearing as successful writes.
- **Accessibility:** provide associated form labels, validation feedback, and meaningful action labels.
- **Maintainability:** keep data operations, server actions, and UI components separated according to the existing project structure.
- **Performance:** keep the patient table indexed by its ownership key and render patient data on the server.

## 10. Delivery plan

1. Configure Supabase project URL and public/anon key in local and production environments.
2. Create test users through Supabase Auth.
3. Run the patient schema and RLS setup SQL.
4. Run the Next.js production build and review type-check results.
5. Test patient CRUD while signed in.
6. Test isolation with two Supabase users, including attempting to open another user's edit URL.
7. Configure production secrets and deploy.

## 11. Acceptance criteria

- The production build completes without TypeScript errors.
- An unauthenticated user cannot access dashboard routes.
- A signed-in user can create, list, update, and delete their own patient records.
- A second user cannot see or modify the first user's patient records.
- A cross-user edit URL resolves to the not-found experience.
- Existing invoice and customer dashboard routes remain available.
- The SQL setup and environment configuration are documented.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Supabase is not configured in a deployment | Validate required public environment values and document setup. |
| RLS is disabled or policies are incomplete | Apply the reviewed SQL setup and test with separate application users. |
| Existing credentials exist only in the legacy Postgres users table | Create or migrate accounts to Supabase Auth before using the new login flow. |
| Two data services increase operational complexity | Document which features use each service and monitor both configurations. |
| Patient information is sensitive | Limit stored fields, enforce RLS, protect secrets, and arrange an appropriate privacy/security review before real-world clinical use. |
| A future shared-staff workflow needs wider access | Define explicit roles and policies separately; do not grant broad access by default. |

## 13. Future considerations

- Decide whether invoices and customers should eventually use Supabase or remain on the current PostgreSQL service.
- Add role-based access only after requirements for owners, clinicians, or administrative staff are defined.
- Add audit logging and retention/deletion policies if operational requirements call for them.
- Conduct a formal security, privacy, backup, and compliance assessment before storing real patient information.
- Add automated tests for validation, authentication redirects, patient ownership, and cross-user denial.

## 14. Current implementation references

- Project setup and commands: [`README.md`](./README.md)
- Patient schema and row-level security: [`supabase/patients.sql`](./supabase/patients.sql)
- Supabase server client: [`app/lib/supabase.ts`](./app/lib/supabase.ts)
- Patient routes: [`app/dashboard/patients`](./app/dashboard/patients)
- Patient forms: [`app/ui/patients`](./app/ui/patients)
