# Family Clinic Dashboard

**Deployed base:** https://nextjs-dashoard-psi.vercel.app

**Dashboard route:** https://nextjs-dashoard-psi.vercel.app/medi-clinic

**Repository:** https://github.com/ammara-tech/nextjs-dashoard

**Student:** Ammara Badat

## 1. Domain

A small family practice has one owner and two front-desk staff. The owner
reviews the dashboard each Monday to decide whether to add a second consulting
day and how to reduce missed appointments. Front-desk staff maintain patient
records and appointment schedules during the week.

## 2. Entities (exactly three)

| Entity | Replaces | Fields (name: type) |
|---|---|---|
| patients | customers | id: uuid, user_id: uuid, full_name: text, phone: text, date_of_birth: date, created_at: timestamp |
| appointments | invoices | id: uuid, user_id: uuid, patient_id: uuid (fk to patients), starts_at: timestamp, status: enum(booked, done, no_show), created_at: timestamp |
| treatments | revenue | id: uuid, user_id: uuid, appointment_id: uuid (fk to appointments), procedure: text, fee_cents: integer, created_at: timestamp |

Each record belongs to the clinic owner through `user_id`. Appointments refer to
patients, and treatments refer to appointments.

## 3. Charts (exactly two)

| # | Question it answers | Who acts on the answer | Chart type | Data it needs |
|---|---|---|---|---|
| 1 | Is the practice growing? How many new patients joined each month? | The owner decides whether to open a second consulting day. | Bar, one bar per month | Count of patients by month of `created_at`, for the last six calendar months |
| 2 | What share of this month's appointments are no-shows? | The owner decides whether to send reminder messages. | Donut | This month's appointments joined to patients, counted by status |

Both charts use the signed-in user's clinic data. The patient chart includes
months with no new patients; the appointment chart shows booked, done, and
no-show counts.

## 4. Roles

| Role | Can see | Can change |
|---|---|---|
| owner | Patients, appointments, treatments, and dashboard charts | Create, edit, and delete patients and appointments; create, edit, and delete treatments |
| front desk | Patients, appointments, and dashboard charts | Create and edit patients and appointments; no deletes and no treatment access |

Supabase Row Level Security (RLS) enforces clinic ownership and role-specific
permissions in the database. Front-desk accounts are linked to the clinic
owner; role information is stored in trusted Supabase `app_metadata`.

## 5. Stretch

A **Tomorrow** page lists booked appointments for the next calendar day with
each patient's name, appointment time, and phone number.

## 6. Out of scope

Online patient booking, sending reminder messages, medical aid claims,
supporting more than one practice, and a mobile app.

## Build order and chart decisions

1. Create `patients` first because it is the parent entity referenced by
   appointments.
2. Build the first chart from `patients` alone: group patient records by
   `created_at` month and show the most recent six calendar months.
3. Add appointments with a foreign key to patients.
4. Build the second chart by joining this month's appointments to patients and
   counting appointment statuses.
5. Add treatments with a foreign key to appointments, then apply RLS policies
   so owners have full access and front-desk users have only the permissions
   listed above.

## Success criteria

- The clinic dashboard is available at `/medi-clinic` without replacing the
  existing application home route.
- The dashboard shows exactly two charts: six months of new patients and this
  month's appointment status distribution.
- Owner and front-desk permissions are enforced by database RLS as well as by
  the application interface.
- The Tomorrow page lists only booked appointments on the next calendar day
  and includes patient phone numbers when available.
