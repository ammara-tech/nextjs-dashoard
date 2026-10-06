do $$
begin
  create type public.appointment_status as enum ('booked', 'done', 'no_show');
exception
  when duplicate_object then null;
end $$;

create or replace function public.current_clinic_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_role', 'front_desk')
$$;

create or replace function public.current_clinic_owner_id()
returns uuid
language sql
stable
as $$
  select case
    when public.current_clinic_role() = 'owner' then auth.uid()
    else coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'clinic_owner_id')::uuid,
      auth.uid()
    )
  end
$$;

revoke all on function public.current_clinic_role() from public;
revoke all on function public.current_clinic_owner_id() from public;
grant execute on function public.current_clinic_role() to authenticated;
grant execute on function public.current_clinic_owner_id() to authenticated;

alter table public.patients
  alter column user_id set default public.current_clinic_owner_id();

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  patient_id uuid not null references public.patients (id) on delete cascade,
  starts_at timestamptz not null,
  status public.appointment_status not null default 'booked',
  created_at timestamptz not null default now()
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  procedure text not null,
  fee_cents integer not null check (fee_cents >= 0),
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.treatments enable row level security;

revoke all on table public.patients, public.appointments, public.treatments
  from anon, authenticated;
grant select, insert, update, delete
  on table public.patients, public.appointments, public.treatments
  to authenticated;

drop policy if exists "patients: owner can select" on public.patients;
drop policy if exists "patients: owner can insert" on public.patients;
drop policy if exists "patients: owner can update" on public.patients;
drop policy if exists "patients: owner can delete" on public.patients;
drop policy if exists "patients: clinic access" on public.patients;
drop policy if exists "patients: clinic insert" on public.patients;
drop policy if exists "patients: clinic update" on public.patients;
drop policy if exists "patients: owner delete" on public.patients;

create policy "patients: clinic access"
  on public.patients for select
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
  );

create policy "patients: clinic insert"
  on public.patients for insert
  to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
  );

create policy "patients: clinic update"
  on public.patients for update
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
  );

create policy "patients: owner delete"
  on public.patients for delete
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create policy "appointments: clinic access"
  on public.appointments for select
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
  );

create policy "appointments: clinic insert"
  on public.appointments for insert
  to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
    and exists (
      select 1
      from public.patients p
      where p.id = patient_id
        and p.user_id = (select public.current_clinic_owner_id())
    )
  );

create policy "appointments: clinic update"
  on public.appointments for update
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
    and exists (
      select 1
      from public.patients p
      where p.id = patient_id
        and p.user_id = (select public.current_clinic_owner_id())
    )
  );

create policy "appointments: owner delete"
  on public.appointments for delete
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create policy "treatments: owner access"
  on public.treatments for select
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create policy "treatments: owner insert"
  on public.treatments for insert
  to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
    and exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and a.user_id = (select public.current_clinic_owner_id())
    )
  );

create policy "treatments: owner update"
  on public.treatments for update
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
    and exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and a.user_id = (select public.current_clinic_owner_id())
    )
  );

create policy "treatments: owner delete"
  on public.treatments for delete
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create index if not exists patients_user_id_idx
  on public.patients (user_id);
create index if not exists appointments_user_id_starts_at_idx
  on public.appointments (user_id, starts_at);
create index if not exists appointments_patient_id_idx
  on public.appointments (patient_id);
create index if not exists treatments_user_id_idx
  on public.treatments (user_id);
create index if not exists treatments_appointment_id_idx
  on public.treatments (appointment_id);
