# Worked example: a complete PROPOSAL.md (clinic)

**Goal**: see one `PROPOSAL.md` that meets every rule of last Thursday's template, then fix yours in 20 minutes. You keep your own domain; copy the shape, not the clinic.

## 1. The rule that decides your build order

- Build the parent entity first: the one the others point at with a foreign key (fk).
- Chart one must be answerable from entity one alone.
- If your chart one needs entity two, swap the order of your charts.

Here `patients` is the parent, so chart one counts patients and nothing else.

## 2. The worked example

```markdown
# Family Clinic Dashboard

**Deployed base**: https://<your-app>.vercel.app
**Repo**: https://github.com/<you>/<repo>
**Student**: <your name>

## 1. Domain
A small family practice with one owner and two front-desk staff.
The owner uses the dashboard every Monday to decide whether the
practice needs more consulting days and how to cut missed appointments.

## 2. Entities (exactly three)
| Entity | Replaces | Fields (name: type) |
|---|---|---|
| patients | customers | id: uuid, user_id: uuid, full_name: text, phone: text, date_of_birth: date, created_at: timestamp |
| appointments | invoices | id: uuid, user_id: uuid, patient_id: uuid (fk to patients), starts_at: timestamp, status: enum(booked, done, no_show), created_at: timestamp |
| treatments | revenue | id: uuid, user_id: uuid, appointment_id: uuid (fk to appointments), procedure: text, fee_cents: integer, created_at: timestamp |

## 3. Charts (exactly two)
| # | Question it answers | Who acts on the answer | Chart type | Data it needs |
|---|---|---|---|---|
| 1 | Is the practice growing? How many new patients joined each month? | owner decides whether to open a second consulting day | bar, one bar per month | count of patients by month of created_at, last 6 months |
| 2 | What share of this month's appointments are no-shows? | owner decides whether to send reminder messages | donut | appointments this month joined to patients, counted by status |

## 4. Roles
| Role | Can see | Can change |
|---|---|---|
| owner | everything | everything |
| front desk | patients and appointments | create and edit patients and appointments; no deletes, no treatments |

## 5. Stretch
A "tomorrow" page listing booked appointments with each patient's phone number.

## 6. Out of scope
Online booking by patients, sending messages, medical aid claims,
more than one practice, a mobile app.
```

## 3. Why it passes

- Domain: says who uses it and which weekly decision it supports.
- Exactly three entities, each with a field the Learn tables never had (phone, status, fee_cents).
- Every entity has `id`, `user_id` and `created_at`, so the Row Level Security (RLS) recipe from Monday fits all three.
- Exactly two charts, each written as a question with a named person who acts.
- Chart one needs only `patients`; chart two crosses both entities and is a different shape (donut, not bar).
- The roles table is specific enough to turn into policies.
- Stretch is one line; out of scope names real temptations.

## If it goes wrong

- Chart one needs two tables: swap your charts, or pick a chart one that counts the parent alone.
- Four entities: cut one into "Out of scope".
- A chart with no person who acts: ask "who changes what on Monday because of this?" and write that down.
- Roles say "admin can do stuff": list what each role can see and change, table by table.

## Key takeaways

- Parent entity first; chart one from entity one; otherwise swap the charts.
- A chart is a question plus a person who acts, not a chart type.
- Commit the fix:

```bash
git commit -am "docs: tighten PROPOSAL.md"
git push
```

## References

- Supabase, Row Level Security (the recipe every entity above follows): https://supabase.com/docs/guides/database/postgres/row-level-security
