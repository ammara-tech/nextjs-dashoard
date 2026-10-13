# Medical Aid (Care Plans) Dashboard: Proposal

**Project:** Family Clinic Care Plans, the clinic's own medical aid
**Route:** `/medical-aid` (landing page, sign-in, sign-up) and `/medical-aid/dashboard`
**Deployed base:** https://nextjs-dashoard-psi.vercel.app
**Repository:** https://github.com/ammara-tech/nextjs-dashoard
**Status:** Built as a working demo. No payment gateway is connected: joining a plan records a clearly labelled demo payment and no money moves.

## 1. Purpose

Give patients a separate, friendly place to join a Family Clinic Care Plan,
choose which saved card pays for it, and see their cover and documents. It is
a separate dashboard from the clinic and the billing dashboard, with its own
card on the landing page, but it shares the same Supabase accounts so patients
sign in once.

## 2. Goals

1. "Enquire about {plan}" in the patient portal sends the patient to the Care
   Plans area with that plan selected.
2. Same login and create-user flow as the clinic, returning to Care Plans.
3. A landing page styled like the clinic hub: hero, how it works, plans,
   questions and answers, and sign-up.
4. Patients save cards online and choose which saved card each plan is debited
   from.
5. After "paying", the patient side shows their plan with demo medical aid PDFs.

## 3. Scope

### Included

- Landing page `/medical-aid` with plan-aware calls to action (signed in or not),
  how-it-works steps and eight questions and answers.
- `/medical-aid/login` and `/medical-aid/register` using the existing accounts.
- `/medical-aid/dashboard` tabs: overview, plans, cards, payments, documents.
- Three plans: Essential (R199/month), Family Plus (R549/month) and Premium
  (R899/month), seeded in `clinic_care_plans`.
- Saved cards (masked brand, last four digits, expiry) with a default card.
- Join, change card and cancel plan, through secure database functions.
- Payment history of demo payments and six sample PDFs in `public/care-plans`
  (three benefit guides, membership certificate, terms and debit authorisation).
- The patient portal's Medical aid tab shows the joined plan.
- A PDF invoice for every payment, downloadable from the payments table (`/medi-clinic/invoices/care-plan/[id]`), marked as a demo.
- A "Paid by month" chart on the overview with a hover card showing the amount, payments and plan.
- Teal Medical Aid colours and logo, and back, forward and refresh arrows on its pages.

### Not included

- A real payment gateway, real debit orders or card verification.
- Claims, provider network checks or regulatory approval as a medical scheme.
- A staff view of plan members and refunds.
- Storage of card numbers or CVV (never stored).

## 4. Data and security

- Tables: `clinic_care_plans`, `clinic_care_plan_memberships` (one active plan
  per patient, enforced by a partial unique index) and
  `clinic_care_plan_payments` (`is_demo = true`).
- Patients can only read their own memberships and payments under RLS; they
  have no insert, update or delete rights on these tables.
- Writes go through security-definer functions `enrol_in_care_plan`,
  `change_care_plan_card` and `cancel_care_plan` with an empty `search_path`.
  The price is read from the database, never from the browser; the chosen card
  must belong to the patient and not be expired.
- Cancelling keeps payment history.
- The app shows a setup notice instead of failing if the migration has not been run.

## 5. Delivery and acceptance

1. Run `supabase/clinic-care-plans.sql` (after `clinic-saved-cards.sql`).
2. Sign in as a patient, open the clinic portal and choose "Enquire about" a plan.
3. Confirm the Care Plans dashboard opens with that plan selected, join with a
   saved card and see the plan, a demo payment and the sample PDFs.
4. Confirm the plan also shows in the patient portal's Medical aid tab.
5. Confirm staff accounts see a "patients only" notice and a second patient
   cannot see the first patient's plan.

The SQL was tested on a local PostgreSQL 16: enrolment creates a membership and
a demo payment at the database price, a second active plan is rejected, direct
writes are denied, other patients' data is invisible, and expired or foreign
cards are rejected.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Demo payments mistaken for real ones | Every payment and plan page says demo; no gateway is wired. |
| Presenting the plans as an insurance product | Pages state that plan prices, benefits and documents are illustrative and final terms are confirmed by the clinic. |
| Card data exposure | Only brand, last four digits and expiry are stored. |
| Price tampering | Price comes from the database function, not the form. |

## 7. Next steps

A payment gateway with verified webhooks, a staff view of members, cancellation
and refund rules, and legal review before any real members are taken on.
