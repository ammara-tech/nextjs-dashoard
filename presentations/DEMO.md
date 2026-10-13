# DEMO.md: Family Clinic Platform
 
Production: https://nextjs-dashoard-psi.vercel.app
 
1. **Hook:** "Your health data lives in more places than your socks, and clinics keep the most personal data we have in a shared spreadsheet and a prayer."
The Family Clinic Platform is a secure clinic system for families, doctors, reception and pharmacy, with a Care Plans dashboard and an invoice dashboard, all in one login system.
 
3. **Problem:** Without it, bookings, patient records, payments, plans and invoices live in separate tools, which is slow for families and risky for health data, because a receptionist, a doctor and a pharmacist should not all see the same things.
 
4. **Walk:** Sign in as a patient > create: book an appointment with a provider in an open slot > edit: open My profile and change the phone number, then save > chart: open the admin dashboard and show "Is the practice growing? New patients per month" (bar chart) and "What share of this month's appointments are no-shows?" (donut, for example 4 of 46), hovering a bar or slice to show its statistics card > toggle dark mode and Afrikaans, press ? to show the keyboard shortcuts, then sign out.
 
5. **Decision:** I chose to enforce access in the database with Supabase row-level security, and to store roles in trusted Auth settings that users cannot edit, because hiding things on the screen is not enough: even if someone tampers with the page, the database still refuses to show another patient's records.
 
6. **Limits:** Two limits: the payment is a labelled demo record with no gateway and no money moving (only brand, last four digits and expiry are stored), and I claim no POPIA or other compliance, so a legal and privacy review is needed before real patient data. Next steps: (1) connect a real payment gateway with verified webhooks, (2) add staff tools for plan members and refunds, plus e-mail and SMS alerts on top of the in-app notifications, (3) complete the legal and privacy review, (4) implementing the offline features across all dashboards to ensure access and secure/linked communications.
