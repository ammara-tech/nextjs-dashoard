# DEMO.md: Family Clinic Platform

Production: https://nextjs-dashoard-psi.vercel.app

1. **Hook:** "The Family Clinic Platform is a secure clinic system for family practices, where reception, doctors, pharmacy and patients each see only what their role allows."

2. **Problem:** Without it, bookings, patient records, payments, plans and claims live in separate tools and shared spreadsheets, which is slow for families and risky for health data, because a receptionist, a doctor and a pharmacist should not all see the same things.

3. **Walk:** Sign in as admin > create: book an appointment, choosing the patient from a dropdown > edit: reschedule it or change its status > chart: "Is the practice growing? New patients per month" (bar) and "What share of this month's appointments are no-shows?" (donut), hovering a bar or slice for its statistics card > show the Care Plan members page and a claim moving through its stages > sign out, then sign in as a patient to show My profile (edit the phone number), their own plan, claims and nothing else > sign out.

4. **Decision:** I chose to enforce access in the database with Supabase row-level security, and to store roles in trusted Auth settings that users cannot edit, because hiding things on the screen is not enough: even if someone tampers with the page, the database still refuses to show another patient's records.

5. **Limits:** Two limits: the payment is a labelled demo record with no gateway and no money moving (only brand, last four digits and expiry are stored), and I claim no POPIA or other compliance, so a legal and privacy review is needed first. Next steps: (1) connect a real payment gateway with verified webhooks, (2) add refunds for plan members plus e-mail and SMS alerts, (3) complete the legal and privacy review.
