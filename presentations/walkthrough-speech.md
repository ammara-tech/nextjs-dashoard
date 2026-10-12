# Family Clinic Platform: the speech

About 5 to 6 minutes spoken. Read the paragraphs as your speech, glance at the key points if you lose your place, and follow the demo cues when you are on screen.

---

## 1. Opening (30 seconds)

> Good day everyone. My name is Ammara Badat, and today I want to show you the Family Clinic platform. It is three dashboards in one secure system: a clinic dashboard for patients, doctors, reception and pharmacy; a Medical Aid dashboard where families join a care plan; and the original Next.js invoice dashboard. I built it with Next.js, Supabase and Vercel.

**Key points:** three dashboards, one system; name the tools; keep it short.
**Demo cue:** have the landing page open with the three cards visible.

---

## 2. The problem (45 seconds)

> A family practice runs on many moving parts: bookings, patient records, payments, medical aid and invoices. Often these live in separate tools. That makes things slow for the family, and it is risky, because health information is sensitive. A receptionist, a doctor and a pharmacist should not all see the same things. So I set out to build one place where every person sees only what they need, and where booking, paying and getting an invoice takes minutes, not phone calls.

**Key points:** scattered tools; sensitive data; the right person sees the right thing; speed for families.

---

## 3. One platform, three dashboards (45 seconds)

> This is the landing page. Each dashboard has its own card and its own colour. The Family Clinic is blue, the Next.js invoice dashboard is navy, and the Medical Aid dashboard is teal, with its own shield-and-cross logo. They share one login system, so a patient signs in once. Everything lives in one repository, which keeps it simple to maintain.

**Key points:** three cards, three colours; shared login; one repository.
**Demo cue:** point at each card and logo in turn.

---

## 4. The Family Clinic: four doors (45 seconds)

> The clinic has four doors: patients, administration, doctors and pharmacy. Each has its own sign-in, and each person sees a different view of the same system. This is enforced in two places. The role is stored in trusted account settings that users cannot edit, and the database itself applies row-level security, so even if someone tampered with the page, the database would still refuse to show another patient's records.

**Key points:** four doors; roles are trusted and not editable; the database enforces access, not just the screen.

---

## 5. The doctor experience (1 minute)

> Let me show you the doctor side. When a doctor signs in, a pop-up asks, "Which doctor are you?" The list shows our sample doctors, with their specialities. Once you choose, you land on that doctor's own dashboard: today's schedule, upcoming appointments, their patients, and their weekly shifts. Shifts are set as a day range, Monday to Friday by default, and shown in a simple weekly grid. If you need to be someone else, one click on the Switch button in the header changes doctor.

**Key points:** pop-up chooser; personal dashboard; Monday to Friday shifts; Switch button.
**Demo cue:** sign in as a doctor, choose a Dr. Sample doctor, show today and the weekly shifts, press Switch.

---

## 6. The patient journey (1 minute)

> A patient creates an account in a minute. From their portal they can book with a provider in an open slot, upload documents such as identity or clinical history into a private store, save payment cards, and see their appointments, prescriptions, plan and invoices. Everything they see is their own data and nobody else's.

**Key points:** quick sign-up; booking from real shifts; private documents; saved cards; own data only.
**Demo cue:** book an appointment, open Documents, open Cards.

---

## 7. Medical Aid and Care Plans (1 minute)

> The family can also join a Care Plan: Essential at R199 a month, Family Plus at R549, or Premium at R899. In the patient portal they press "Enquire about" a plan, and they land in the Medical Aid dashboard with that plan already selected. They sign in, choose which saved card the plan is paid from, and join. Afterwards they see their plan, their payments and sample plan documents. I want to be upfront: this is a demonstration. The payment is a clearly labelled demo record, no gateway is connected, no money moves, and we never store a full card number or security code, only the brand, the last four digits and the expiry.

**Key points:** three plans and prices; enquire, sign in, pick the card, join; demo payment; no card numbers stored.
**Demo cue:** press "Enquire about Family Plus", join, choose a card.

---

## 8. Invoices, created automatically (45 seconds)

> Every payment and every appointment with recorded services now gets a PDF invoice, created automatically. The invoice has the clinic header, who it is billed to, the services, the status and the total. Each invoice number comes from the record itself, so the same record always has the same number. A patient can only download their own invoices.

**Key points:** automatic PDF; consistent number per record; own invoices only; appointment invoices appear once services are recorded.
**Demo cue:** open the Payments tab and download an invoice.

---

## 9. Easy to move around (30 seconds)

> To make it feel professional, there are back, forward and refresh arrows on every login page and inside every dashboard, just like the browser, so nobody gets stuck. There are also loading skeletons between pages, a branded page-not-found screen, and keyboard-friendly focus styles.

**Key points:** arrows everywhere; loading skeletons; branded 404; accessibility.
**Demo cue:** click the arrows on a login page, then show the 404 page.

---

## 10. Security and honesty (45 seconds)

> On security: least privilege everywhere. A stock manager, for example, gets no patient charts. Documents are in a private store and open only through short-lived links. And I want to be clear about limits: no payment gateway is connected, and I am not claiming POPIA or any other certification. Before real patient data is used, a legal and privacy review is needed.

**Key points:** least privilege; private storage with short-lived links; demo payments; no compliance claims.

---

## 11. How it is built and shipped (30 seconds)

> Technically, the app is Next.js with TypeScript, Supabase for sign-in, the database and file storage, and Vercel for hosting. When I merge to the main branch, Vercel builds and publishes it. If a build fails, the previous version stays live, so the site never goes down.

**Key points:** Next.js plus TypeScript; Supabase; Vercel from main; failed builds do not take the site down.

---

## 12. What comes next and closing (30 seconds)

> Next, I would connect a real payment gateway with verified webhooks, add staff tools to view plan members and handle refunds, add notifications, and complete the legal and privacy review. Thank you. I am happy to take questions.

**Key points:** real payments; staff tools; notifications; legal review; invite questions.

---

## Likely questions, with short answers

- **Is the payment real?** No. It is a labelled demo record; no gateway is connected and no money moves.
- **Where is card data kept?** Only the brand, last four digits and expiry. Never the full number or CVV.
- **Can one patient see another's data?** No. The database blocks it with row-level security.
- **Why three dashboards?** They serve different audiences, but one login system and one repository keep it simple.
- **How are invoices created?** On request, from stored payments and appointment services, in one PDF layout.
- **Is it POPIA or HIPAA compliant?** No certification is claimed. It follows least privilege and minimal data, and a legal review is planned before real data.
- **How does a change go live?** Merge to main; Vercel builds and publishes. A failed build leaves the previous version live.

## Delivery tips

- Slow down on the demo steps. Let the screen finish loading before you speak.
- Say "demonstration" and "sample data" out loud when you show payments. It builds trust.
- If something fails live, say "that is the sample data" or "that needs the database script", and move on.
