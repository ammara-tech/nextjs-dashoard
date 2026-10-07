# Family Clinic Dashboard: Upgrade Proposal

**Project:** Family Clinic dashboard  
**Current route:** `/medi-clinic`  
**Deployed base:** https://nextjs-dashoard-psi.vercel.app  
**Repository:** https://github.com/ammara-tech/nextjs-dashoard  
**Status:** Current capabilities are documented separately from proposed work. This is a phased product and technical specification, not a claim that future modules are already implemented.

## 1. Purpose and current baseline

Upgrade the existing family-practice dashboard into a secure clinic operations
platform without replacing the original billing dashboard or weakening current
clinic access controls. Deliver changes incrementally so the practice can
continue using the working patient, appointment, and owner/front-desk flows.

The application currently provides:

- Supabase Auth sign-in and a protected `/medi-clinic` dashboard.
- Clinic roles `owner` and `front_desk`, sourced from trusted Supabase
  `app_metadata`; front-desk accounts are linked to an owner account.
- Patient records with name, phone, date of birth, and creation date.
- Appointments with a patient, start time, and `booked`, `done`, or `no_show`
  status.
- Owner-managed treatments with a procedure and fee in cents.
- Two dashboard charts: new patients over six calendar months and appointment
  status counts for the current month.
- A tomorrow view of booked appointments, with patient contact details.
- PostgreSQL row-level security (RLS) in `supabase/patients.sql` and
  `supabase/medi-clinic.sql`.

These capabilities remain the foundation. The wider patient portal, clinical
records, pharmacy, payments, wallets, notifications, and multi-provider
scheduling described below are proposed extensions and require separate
design, migrations, and testing.

## 2. Product goals and scope

### Goals

1. Keep clinic records isolated to their practice and authorized staff.
2. Make appointments and provider availability reliable under concurrent
   changes.
3. Give patients secure access to their own profile, appointments, documents,
   and eligible payment information when the patient portal is introduced.
4. Add clinical and pharmacy workflows only with least-privilege permissions
   and auditable records.
5. Preserve the existing dashboard, route behavior, and two overview charts
   unless an explicitly approved product change replaces them.

### Not a first-release promise

Online patient self-booking, online payment collection, wallet refunds, a
complete EHR, laboratory integrations, prescription fulfillment, live chat,
automated email, multiple practices, and regulatory certification are not
current features. They are phased proposals below. Do not advertise them as
available until implementation, operational readiness, and applicable legal
review are complete.

## 3. Authentication, roles, and route protection

### Current access model

`/medi-clinic` and its subroutes require a valid Supabase session. The clinic
application resolves `owner` versus `front_desk` using trusted `app_metadata`;
database RLS is the authoritative access boundary. Missing or invalid clinic
roles must not be treated as a privileged role. Continue to keep the existing
`/dashboard` billing area and its login flow separate from clinic routes.

### Proposed roles

Introduce additional roles only when their workflows are ready. Store
authorization in server-controlled claims or relational membership records,
never in user-editable profile metadata.

| Role | Proposed access |
|---|---|
| Owner / clinic administrator | Manage clinic membership and operational configuration; access clinic records as permitted by policy. |
| Reception / front desk | Maintain patient demographics, schedule appointments, check patients in, and record in-person payment status where authorized. |
| Doctor / clinician | Access assigned clinical schedules and authorized patient charts; create and sign clinical notes and orders. |
| Pharmacist | Review and dispense authorized prescriptions; view only the information needed for medication safety and fulfillment. |
| Stock manager | Manage medication and supply inventory, batches, and expiry dates; no default access to clinical notes. |
| Patient | Access only their own verified profile, appointments, documents, and financial records exposed through the patient portal. |

Role grants should be explicit and scoped to a clinic. Do not infer broad
permissions from a missing role or use UI link visibility as authorization.
Server actions, route handlers, database policies, and storage policies must
enforce the same permissions.

### Development test account

The supplied proposal mentions `user@nextmail.com`. If a controlled test-only
route or account is needed, allowlist it only in a non-production environment,
behind an explicit environment setting and normal authentication. It must not
bypass login, grant clinic privileges, or authorize production access based on
email alone. The current application has no `/dashboard/user` patient portal;
do not add this guard to unrelated `/dashboard` or `/medi-clinic` routes.

## 4. Data model and ownership

Retain the current `patients`, `appointments`, and `treatments` entities and
their clinic-owner `user_id` ownership model during the initial upgrade.
Introduce new tables through reviewed, forward-only migrations. Avoid storing
clinical, identity, or payment data in free-form metadata or logs.

| Area | Proposed records and important relationships |
|---|---|
| Clinic access | Clinic membership and role assignment; bind staff to a clinic/owner and enforce the binding in every query and policy. |
| Patient profile | Existing patient identity and contact fields; add verified email and patient-account link only when patient sign-in is implemented. Keep the internal patient UUID separate from any public patient number. |
| Provider scheduling | Providers, specialties, working shifts, leave/clinical blocks, and appointment types; appointments reference a provider and a configured duration. |
| Appointment operations | Extend lifecycle deliberately for requested, confirmed, checked-in, in-progress, completed, cancelled, and no-show states; record who changed status and when. Define allowed transitions. |
| Clinical record | Encounter, signed note, addendum, diagnosis, allergy, medication, order, and result records. Use append-only amendments after signature rather than rewriting signed content. |
| Documents | Private object metadata linked to a patient and, where relevant, encounter, invoice, or prescription. Store object paths, not public URLs, in application records. |
| Payments | Payment intent/transaction and invoice records with provider reference, amount in integer minor units, currency, payment method, status, and reconciliation details. |
| Wallet (future) | Append-only credit/debit ledger entries with source transaction, reason, actor, and idempotency key. Derive balance from ledger entries; never treat a client-submitted balance as authoritative. |
| Pharmacy (future) | Prescription, dispense, medication catalog, stock movement, batch, and expiry records with separate clinical and inventory permissions. |
| Audit | Append-only security and clinical audit events for access, changes, signatures, exports, and administrative actions; exclude secrets and unnecessary sensitive payloads. |

Every tenant-owned record must have a trustworthy clinic identifier or owner
binding and a foreign-key relationship that cannot cross clinic boundaries.
Use composite constraints or equivalent database checks where a simple
foreign key could link records from different clinics. Do not cascade-delete
clinical, payment, or audit history.

## 5. Appointment and queue engine

### Scheduling rules

- Add provider schedules, time zone, shift windows, leave, and explicit
  clinical blocks before enabling provider-specific booking.
- Configure appointment types and durations as clinic-approved data rather
  than hard-coding a universal duration into UI code.
- Use the consultation categories in the original proposal as candidate
  defaults only: routine/preventive (30 min), acute (20 min), chronic
  management (40 min), new/concerning symptoms (45 min), and administrative
  (15 min). Specialist and surgical durations must be configured by the
  practice. A booking category is not a clinical triage or diagnosis.
- Enforce provider shift, block, duration, and daily-cap rules on the server
  and in the database transaction that confirms a booking. A UI availability
  check alone cannot prevent simultaneous bookings.
- Treat the proposed daily maximum of 20 appointments as a configurable
  provider/clinic limit, not a universal default.
- Preserve an explicit save/confirm action for staff edits, show pending
  status while saving, prevent duplicate submissions, and report failed saves
  clearly.
- Record changes to appointment time, provider, status, and cancellation
  reason with actor and timestamp.

### Patient alternatives and delays

When a slot is unavailable or a clinic delay is recorded, offer nearby valid
times and providers with a matching configured specialty. Recheck availability
at confirmation time. Do not move or cancel a booking silently. Define the
delay threshold, refund eligibility, and free-reschedule terms with clinic
operations before enabling those options.

The current status enum and booking form cover only the existing simpler
workflow. Add new statuses through a reviewed migration and update database
policies, forms, reports, and tests together.

## 6. Private documents and Supabase Storage

When documents are introduced, create a private bucket such as
`patients-medical-records`. Use a stable patient-record identifier for
organization, for example:

```text
pt_<patient-record-uuid>/identity/
pt_<patient-record-uuid>/clinical_history/
pt_<patient-record-uuid>/invoices/
```

The folder name is organization, not an authorization mechanism by itself.
Storage object policies must verify that the signed-in user is linked to the
patient or has an authorized clinic role for the specific clinic. Patient
accounts need an explicit, verified link to a patient record; `auth.uid()` is
not automatically the patient record UUID.

- Keep the bucket private. Do not expose public object URLs or accept
  caller-provided paths as proof of access.
- Apply least-privilege `storage.objects` policies for select, insert, update,
  and delete operations as required. Restrict path prefixes and allowed
  content types/size; validate uploads server-side.
- Generate short-lived signed URLs only after server-side authorization and
  only for the specific object requested. A 15-minute expiry is a proposed
  maximum, not a substitute for access checks.
- Do not expose a Supabase service-role key in the client. Elevated server
  access must be narrowly scoped, audited, and never used to bypass a
  missing policy.
- Malware scanning, retention, export, backup, and recovery procedures must
  be decided before accepting clinical documents.

## 7. Payments, invoices, and wallet (later phase)

Keep payment collection out of the first scheduling upgrade. When approved:

- Use a supported payment provider; do not store card numbers or security
  codes. Verify provider webhooks server-side and make processing idempotent.
- Track payment states such as `pending`, `paid`, `failed`, `refunded`, and
  `refund_pending` as distinct states. `outgoing` should be reserved for a
  clearly defined payout/refund workflow rather than used ambiguously.
- Generate invoices from finalized server-side transactions. Keep the source
  transaction reference and immutable invoice snapshot; do not claim that an
  invoice is cryptographically generated unless that mechanism exists.
- Record in-person payment by an authorized staff member with amount, method,
  timestamp, and actor. Reconcile it independently from online provider
  events.
- If wallet credit is approved, issue it as an append-only ledger transaction
  linked to the original payment and cancellation/refund reason. Protect
  against repeated refunds with a unique idempotency key and database
  transaction.
- Define cancellation, clinic-delay, and rescheduling terms before refund
  automation. A wallet credit is not the same as a refund to the original
  payment method.
- Send receipts only to a verified address after a successful transaction;
  email is a notification channel, not the system of record.

## 8. Clinical workflow and records

Clinical records are a separate high-sensitivity module and should not be
implemented as extra fields on the current patient table.

- Restrict chart access to authorized care relationships and the minimum
  required role scope; log sensitive reads and exports.
- Support encounter notes as drafts until signed. After signature, preserve
  the signed version and add corrections as attributed, timestamped
  addenda—never silently overwrite.
- Add check-in and queue states as operational records separate from the
  clinical note. Restrict queue details to staff who need them.
- Model allergies, active medications, diagnoses, orders, and results with
  source, author, date, and status. Do not imply that the software performs
  validated drug-interaction checks unless a qualified integration and
  clinical review are in place.
- Provide archive/hide behavior without erasing legally retained history.
  Define correction, retention, legal hold, export, and deletion procedures
  with qualified counsel and the clinic's jurisdiction before launch.
- Build pharmacy dispensing and inventory as separate permissioned workflows;
  a stock manager should not gain chart access simply by managing inventory.

## 9. Retention, privacy, and audit

Retention periods and patient rights vary by jurisdiction, record type, age,
and circumstances. The seven-to-ten-year and age-21 periods in the original
proposal are examples only and must not be treated as legal advice or a
universal policy. Before storing real clinical data, obtain jurisdiction-
specific legal and privacy review and document an approved retention schedule.

Plan for access logging, least privilege, secure backups, incident response,
data export, correction requests, legal holds, and tested recovery. Avoid
promising permanent retention or absolute deletion prohibition until legal
obligations and technical lifecycle controls have been reconciled. Do not
claim HIPAA, GDPR, or other regulatory compliance solely because Supabase
RLS or signed URLs are used.

## 10. Support and notifications

Later support channels may include clinic phone details, a website enquiry
form routed to a staff queue, and in-person reception. Do not promise live
chat until staffing, access control, data retention, and response expectations
are defined. Avoid collecting urgent/emergency clinical information through
channels that are not monitored continuously.

Appointment confirmations, reminders, invoices, and result notifications
require verified contact details, patient communication preferences, delivery
logging, retry behavior, and a clear process for failed delivery. Do not
include unnecessary sensitive clinical details in email or SMS.

## 11. Phased delivery plan

| Phase | Deliverable | Completion gate |
|---|---|---|
| 0. Harden baseline | Review current migrations and RLS; confirm clinic membership behavior; remove test-only assumptions from production configuration; add migration and access-policy tests. | Existing owner/front-desk flows and billing dashboard remain functional; cross-clinic access tests fail closed. |
| 1. Scheduling foundation | Add provider/specialty configuration, appointment types, shifts, blocks, and transactional conflict prevention. Keep staff booking as the initial entry point. | Concurrent bookings cannot reserve the same provider/time; limits and timezone boundaries are tested. |
| 2. Operational queue | Add check-in, delay, cancellation, reschedule, and staff audit events; show clear save and error states. | Allowed status transitions and actor attribution are enforced server-side. |
| 3. Patient portal and documents | Add verified patient-account linking, self-service profile, patient-owned appointment views, private document storage, and storage policies. | Patient A cannot read or mutate patient B's records or objects; signed links expire as configured. |
| 4. Clinical records | Add encounter workflow, signed notes/addenda, chart access controls, and audit events. | Clinical permissions and immutable signature/addendum behavior pass security and workflow review. |
| 5. Payments and notifications | Integrate payment provider, invoices, reconciliation, verified email notifications, and—only if approved—wallet ledger/refunds. | Webhook verification, duplicate-event handling, refund idempotency, and reconciliation are tested. |
| 6. Pharmacy and inventory | Add prescription fulfillment, stock movements, batches, expiry alerts, and role-scoped access. | Clinical, pharmacy, and inventory permissions are independently verified. |

Phases may be reprioritized by clinic needs, but dependencies and completion
gates remain. Do not start collecting real clinical or payment data before the
relevant phase's security, operational, and legal gates are met.

## 12. Testing and acceptance criteria

- The existing `/medi-clinic` route, owner/front-desk experience, two charts,
  tomorrow list, and separate billing dashboard continue to work.
- A role cannot gain access by editing client state, query parameters, or
  profile metadata. Test database and storage policies with authenticated
  users and multiple clinic identities.
- Every new migration is repeatable where practical, reviewed for foreign-key
  integrity, and tested against a representative existing database.
- Scheduling tests cover concurrent requests, overlapping durations, blocks,
  daily limits, daylight-saving/timezone boundaries, and reschedule outcomes.
- Patient portal tests cover identity linking and cross-patient isolation.
- Clinical tests cover draft, sign, and addendum transitions and audit
  attribution.
- Payment tests cover invalid signatures, retries, duplicate webhooks,
  partial failures, refund idempotency, and reconciliation.
- User-facing save operations expose loading, success, and actionable failure
  states; they do not show success when persistence failed.

## 13. Support and operating assumptions

The initial deployment remains a single family practice with an owner and
front-desk staff. Supporting multiple independent practices requires an
explicit tenant model and dedicated isolation tests before onboarding another
clinic. Production secrets belong in the hosting provider's secret store, not
source control or browser code. Schema and policy changes are deployed through
reviewed migrations, not undocumented manual edits in the SQL editor.
