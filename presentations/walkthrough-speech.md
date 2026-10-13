# Family Clinic Platform: the speech

About 8 to 9 minutes spoken. Read the paragraphs as your speech, glance at the key points if you lose your place, and follow the demo cues when you are on screen.

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

> Let me show you the doctor side. When a doctor signs in, a pop-up asks, "Which doctor are you?" The list shows our sample doctors, with their specialities. Once you choose, you land on that doctor's own dashboard: today's schedule, upcoming appointments, their patients, and their weekly shifts. Shifts are set as a day range, Monday to Friday by default, and shown in a simple weekly grid. There is also a Calendar page that shows the whole week as a grid, with the doctor's available hours shaded in, and hovering over any appointment shows its details. If you need to be someone else, one click on the Switch button in the header changes doctor.

**Key points:** pop-up chooser; personal dashboard; Monday to Friday shifts; week calendar with availability shaded; Switch button.
**Demo cue:** sign in as a doctor, choose a Dr. Sample doctor, show today and the weekly shifts, open Calendar and hover an appointment, press Switch.

---

## 6. The patient journey (1 minute)

> A patient creates an account in a minute. From their portal they can book with a provider in an open slot, upload documents such as identity or clinical history into a private store, save payment cards, and see their appointments, prescriptions, claims, plan and invoices. They can also edit their own profile: name, phone number, email and date of birth. Everything they see is their own data and nobody else's.

**Key points:** quick sign-up; booking from real shifts; private documents; saved cards; edit own profile; own data only.
**Demo cue:** book an appointment, open Documents, open Cards, then open My profile and change the phone number.

---

## 7. Medical Aid and Care Plans (1 minute)

> The family can also join a Care Plan: Essential at R199 a month, Family Plus at R549, or Premium at R899. In the patient portal they press "Enquire about" a plan, and they land in the Medical Aid dashboard with that plan already selected. They sign in, choose which saved card the plan is paid from, and join. Afterwards they see their plan, their payments and sample plan documents. I want to be upfront: this is a demonstration. The payment is a clearly labelled demo record, no gateway is connected, no money moves, and we never store a full card number or security code, only the brand, the last four digits and the expiry.

**Key points:** three plans and prices; enquire, sign in, pick the card, join; demo payment; no card numbers stored.
**Demo cue:** press "Enquire about Family Plus", join, choose a card.

---

## 8. Plan progress and claims (1 minute)

> Once a member has joined, the plan page shows how far along they are: a progress bar over the first twelve months, the date of the next payment and how many days remain, the total paid so far, and a schedule of every month, marked paid or upcoming. Members can also submit a medical aid claim, saying what it was for and the amount, and follow it through Submitted, In review, Approved or Rejected, and Paid. On the staff side, the owner and admins also have a Care Plan members page showing who is on which plan, their next payment and what they have paid, and payments, claims and members can be exported to a spreadsheet. The owner, admins and front desk see a board of claims and move each one a single step at a time, with a reason if they reject it. The allowed steps are enforced in the database, so nobody can jump a claim straight to paid. To be clear, claims here are tracked by hand: staff decide each stage, and nothing is adjudicated automatically.

**Key points:** progress bar and schedule; next payment date; submit a claim; four-stage tracker; staff board; rules enforced in the database; claims are tracked, not adjudicated.
**Demo cue:** open the Care Plans overview, then the Claims tab, submit a claim; then switch to a staff account and move it forward on the Claims board.

---

## 9. Invoices, created automatically (45 seconds)

> Every payment and every appointment with recorded services now gets a PDF invoice, created automatically. The invoice has the clinic header, who it is billed to, the services, the status and the total. Each invoice number comes from the record itself, so the same record always has the same number. A patient can only download their own invoices.

**Key points:** automatic PDF; consistent number per record; own invoices only; appointment invoices appear once services are recorded.
**Demo cue:** open the Payments tab and download an invoice.

---

## 10. Easy to move around (30 seconds)

> To make it feel professional, there are back, forward and refresh arrows on every login page and inside every dashboard, just like the browser, so nobody gets stuck. There are also loading skeletons between pages, a branded page-not-found screen, and keyboard-friendly focus styles.

**Key points:** arrows everywhere; loading skeletons; branded 404; accessibility.
**Demo cue:** click the arrows on a login page, then show the 404 page.

---

## 11. Make it yours: theme, language and shortcuts (45 seconds)

> Every header has a small toolbar. The moon button switches the whole app between light and dark mode, and it remembers your choice. The language button switches between English and Afrikaans, covering the navigation, headers and key pages. There are also keyboard shortcuts: T for theme, L for language, and G then a letter to jump to a page your role has, for example G then P for Patients. Press the question mark to see every shortcut.

**Key points:** dark and light mode remembered; English and Afrikaans; keyboard shortcuts limited to your role; question mark lists them.
**Demo cue:** toggle dark mode, switch language, press the question mark, then press G and P.

---

## 12. Live updates and the guided tour (45 seconds)

> The platform also updates itself. When something changes, such as a new appointment, a payment or a claim moving to the next stage, the page refreshes by itself and the bell in the toolbar shows a notification, with an unread count. Who receives what is still decided by the database rules. Finally, for anyone new, the sparkle button starts a ten-step guided tour in plain language, covering the dashboards, the roles and what to try first. It sits in a small card that never blocks the page.

**Key points:** automatic refresh; bell with unread count; access still decided by the database; ten-step tour in plain language.
**Demo cue:** keep one window as staff and one as a patient; submit a claim in one and watch the bell in the other. Then press the sparkle button.

---

## 13. Security and honesty (45 seconds)

> On security: least privilege everywhere. A stock manager, for example, gets no patient charts, and claim stages can only move in the allowed order because the database checks it. Documents are in a private store and open only through short-lived links. And I want to be clear about limits: no payment gateway is connected, and I am not claiming POPIA or any other certification. Before real patient data is used, a legal and privacy review is needed.

**Key points:** least privilege; private storage with short-lived links; demo payments; no compliance claims.

---

## 14. How it is built and shipped (30 seconds)

> Technically, the app is Next.js with TypeScript, Supabase for sign-in, the database and file storage, and Vercel for hosting. When I merge to the main branch, Vercel builds and publishes it. If a build fails, the previous version stays live, so the site never goes down.

**Key points:** Next.js plus TypeScript; Supabase; Vercel from main; failed builds do not take the site down.

---

## 15. What comes next and closing (30 seconds)

> Next, I would connect a real payment gateway with verified webhooks, handle refunds for plan members, add e-mail and text-message alerts on top of the in-app notifications, translate the rest of the pages into Afrikaans, and complete the legal and privacy review. Thank you. I am happy to take questions.

**Key points:** real payments; refunds; e-mail and SMS alerts; finish the Afrikaans translation; legal review; invite questions.

---

## Likely questions, with short answers

- **Is the payment real?** No. It is a labelled demo record; no gateway is connected and no money moves.
- **Where is card data kept?** Only the brand, last four digits and expiry. Never the full number or CVV.
- **Can one patient see another's data?** No. The database blocks it with row-level security.
- **Why three dashboards?** They serve different audiences, but one login system and one repository keep it simple.
- **How are invoices created?** On request, from stored payments and appointment services, in one PDF layout.
- **Is it POPIA or HIPAA compliant?** No certification is claimed. It follows least privilege and minimal data, and a legal review is planned before real data.
- **Can I use it in Afrikaans?** Yes, with the language button. The navigation, headers, calendar, claims, profile, notifications and tour are translated; the remaining page text is still English.
- **How do live updates work?** The app listens for changes through Supabase Realtime, refreshes the page and adds a bell notification. Row-level security still decides who receives each change.
- **Are claims paid or approved automatically?** No. Claims are tracked by hand: staff move each claim through the stages, and the database only allows valid moves.
- **How does dark mode work?** One button remaps the dashboards' colours and remembers the choice; no flash on reload.
- **How does a change go live?** Merge to main; Vercel builds and publishes. A failed build leaves the previous version live.

## Delivery tips

- Slow down on the demo steps. Let the screen finish loading before you speak.
- Say "demonstration" and "sample data" out loud when you show payments. It builds trust.
- Keep two browser windows ready (staff and patient) so live updates are easy to show.
- If something fails live, say "that is the sample data" or "that needs the database script", and move on.
