# Second entity with a foreign key, then the donut

For Checkpoint W30.3 (due Thu 8 Oct 08:00): a second entity with a foreign key to the first, Row Level Security (RLS) and Create, Read, Update, Delete (CRUD), plus a second chart of a different type, deployed. Example: `appointments` under `patients`; use your own names.

## 1. Parent first, then the child

`patients` and its policies exist already. Now the child:

```sql
create table public.appointments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id),
  patient_id uuid not null references public.patients (id) on delete cascade,
  starts_at  timestamptz not null,
  status     text not null default 'booked' check (status in ('booked', 'done', 'no_show')),
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;
revoke all on table public.appointments from anon, authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;

create index appointments_user_id_idx    on public.appointments (user_id);
create index appointments_patient_id_idx on public.appointments (patient_id);
```

The Supabase RLS guide says to index every column your policies filter on, or a read becomes a sequential scan. Policies filter on `user_id`; the cascade delete (and any join in your chart view) looks up `patient_id`.

`on delete cascade` deletes a patient's appointments together with the patient. If your domain must keep them (records, invoices), leave those three words out: the database then refuses to delete a patient who still has appointments.

## 2. The foreign key trap

Postgres says foreign key checks "always bypass row security". With an insert policy that checks only `user_id`, a user who knows another user's patient id can book against that patient. The fix: insert and update also require that the patient is visible to you.

```sql
create policy "appointments: owner can select" on public.appointments
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "appointments: owner can insert" on public.appointments
  for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.patients p where p.id = patient_id));

create policy "appointments: owner can update" on public.appointments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.patients p where p.id = patient_id));

create policy "appointments: owner can delete" on public.appointments
  for delete to authenticated using ((select auth.uid()) = user_id);
```

Why it works: policy expressions "will be run with the rights of the user running the overall query" (Postgres manual). The subquery reads `patients` as you, so the patients select policy hides other users' rows, `exists` is false and the check fails. Built from Wednesday's panel? Run `drop policy "appointments: insert own" on public.appointments;` and the same for `"appointments: update own"` first.

## 3. One create flow through the server client

The `postgres` package logs in over `POSTGRES_URL` as a privileged role; Postgres says superusers and `BYPASSRLS` roles always bypass row security. Use `createClient` from `@/lib/supabase/server`, which sends your JSON Web Token (JWT).

```ts
// app/lib/data.ts (add): RLS returns only your patients
export async function fetchPatientOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('patients').select('id, full_name').order('full_name')
  if (error) throw new Error(error.message)
  return data
}
```

```ts
// app/lib/actions.ts (add; imports as in Wednesday's panel)
export async function createAppointment(formData: FormData) {
  const a = z.object({ patient_id: z.string().min(1), starts_at: z.string().min(16) })
    .parse({ patient_id: formData.get('patient_id'), starts_at: formData.get('starts_at') })
  const supabase = await createClient()
  const { error } = await supabase.from('appointments')
    .insert({ patient_id: a.patient_id, starts_at: fromDateTimeLocal(a.starts_at) })
  if (error?.code === '23503') throw new Error('23503: that patient does not exist')
  if (error?.code === '42501') throw new Error('42501: not your patient, or user_id sent by hand')
  if (error) throw new Error(`${error.code}: ${error.message}`)
  revalidatePath('/dashboard/appointments')
  redirect('/dashboard/appointments')
}
```

```tsx
// app/ui/appointments/create-form.tsx
import { createAppointment } from '@/app/lib/actions'

export default function CreateAppointmentForm({ patients }: { patients: { id: string; full_name: string }[] }) {
  return (
    <form action={createAppointment}>
      <select name="patient_id" defaultValue="" required>
        <option value="" disabled>Select a patient</option>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>
      <input type="datetime-local" name="starts_at" required />
      <button type="submit">Create appointment</button>
    </form>
  )
}
```

23503 is `foreign_key_violation`: `insert or update on table "appointments" violates foreign key constraint "appointments_patient_id_fkey"` (the id exists nowhere). 42501 is the RLS refusal Monday showed for `patients`. Update and delete follow Monday's pattern.

## 4. The two-user proof

In the app: a private window as user two shows an empty list and only user two's patients. Then in the SQL Editor:

```sql
-- first: select id from public.patients where user_id = '<user one id>';
begin;
set local role authenticated;
set local request.jwt.claim.sub = '<user two id>';
select count(*) from public.appointments;  -- user two's rows only
insert into public.appointments (patient_id, starts_at)
  values ('<user one patient id>', now());   -- expect 42501
rollback;
```

## 5. The donut

Follow "Charts guide: first chart in five steps". Its view is `security_invoker`, so the select policies of every table the view reads apply.

## If it goes wrong

- Trap insert succeeds: the `exists` check is missing from insert or update.
- Select box lists everyone's patients: the data function uses the `postgres` package.
- 42501 on your own patient: you sent `user_id` by hand; let the default fill it.
- Donut counts too few: the seed rows belong to another user; or, if your view joins `patients`, a hidden patient row drops its appointments.

## Not covered: two people booking the same slot

Your app assumes one calendar owner: two people booking the same time at the same moment both succeed. That is the same problem as two people choosing the same flight, cinema or event seat. The general approach: the database, not the page, refuses the second booking (a unique constraint on the thing booked; an exclusion constraint for overlapping time ranges), the person who lost sees a clear message, and many systems hold a seat for a few minutes while the customer pays. We do not build or assess this this week; write it under Known gaps if your domain is booking-shaped.

## W30.3 checklist

- [ ] Table, grants, four policies, two indexes
- [ ] Create works in the app; update and delete as on Monday
- [ ] User two sees none of user one's rows; the trap insert gives 42501
- [ ] Chart two titled with the question, labelled, deployed; a different shape from chart one, reading your second entity

## Key takeaways

- Foreign key checks bypass RLS; the child's policies must check the parent.
- Index what policies and joins filter on.
- A `datetime-local` input has no time zone: add `+02:00` on the way in with `fromDateTimeLocal` (Wednesday's panel), or times land two hours out.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://www.postgresql.org/docs/current/sql-createpolicy.html
- https://www.postgresql.org/docs/current/errcodes-appendix.html
- https://www.postgresql.org/docs/current/tutorial-fk.html
