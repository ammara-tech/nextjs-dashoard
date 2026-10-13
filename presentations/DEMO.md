# DEMO.md: Family Clinic Platform

Production: https://nextjs-dashoard-psi.vercel.app

1. **Hook:** The Family Clinic Platform is a secure clinic system for families, doctors, reception and pharmacy, with a Care Plans dashboard and an invoice dashboard, all in one login system.

2. **Problem:** Without it, bookings, patient records, payments, plans and invoices live in separate tools, which is slow for families and risky for health data, because a receptionist, a doctor and a pharmacist should not all see the same things.

3. **Walk:** Sign in as a patient > create: book an appointment with a provider in an open slot > edit: [CONFIRM which edit you show, for example reschedule or update a document] > chart: [CONFIRM which chart and which question it answers] > sign out.

4. **Decision:** I chose to enforce access in the database with Supabase row-level security, and to store roles in trusted Auth settings that users cannot edit, because hiding things on the screen is not enough: even if someone tampers with the page, the database still refuses to show another patient's records.

5. **Limits:** Two limits: the payment is a labelled demo record with no gateway and no money moving (only brand, last four digits and expiry are stored), and I claim no POPIA or other compliance, so a legal and privacy review is needed before real patient data. Next steps: (1) connect a real payment gateway with verified webhooks, (2) add staff tools for plan members, refunds and notifications, (3) complete the legal and privacy review.
