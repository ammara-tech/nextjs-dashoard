create table if not exists public.clinic_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  auth_user_id uuid references auth.users (id),
  display_name text not null check (length(trim(display_name)) > 0),
  specialty text not null check (length(trim(specialty)) > 0),
  time_zone text not null default 'UTC',
  max_daily_appointments integer not null default 20
    check (max_daily_appointments between 1 and 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, auth_user_id)
);

create table if not exists public.clinic_appointment_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.clinic_provider_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  provider_id uuid not null references public.clinic_providers (id),
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (starts_at < ends_at),
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_provider_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  provider_id uuid not null references public.clinic_providers (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

alter table public.appointments
  add column if not exists provider_id uuid
    references public.clinic_providers (id),
  add column if not exists appointment_type_id uuid
    references public.clinic_appointment_types (id),
  add column if not exists duration_minutes integer
    check (duration_minutes between 5 and 480);

alter table public.clinic_providers enable row level security;
alter table public.clinic_appointment_types enable row level security;
alter table public.clinic_provider_shifts enable row level security;
alter table public.clinic_provider_blocks enable row level security;

revoke all on public.clinic_providers, public.clinic_appointment_types,
  public.clinic_provider_shifts, public.clinic_provider_blocks
  from anon, authenticated;
grant select, insert, update, delete on public.clinic_providers,
  public.clinic_appointment_types, public.clinic_provider_shifts,
  public.clinic_provider_blocks to authenticated;

create policy "clinic providers: staff read"
  on public.clinic_providers for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'doctor', 'admin', 'patient')
  );
create policy "clinic providers: owner manage"
  on public.clinic_providers for all to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create policy "appointment types: staff read"
  on public.clinic_appointment_types for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'doctor', 'admin', 'patient')
  );
create policy "appointment types: owner manage"
  on public.clinic_appointment_types for all to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create policy "provider shifts: staff read"
  on public.clinic_provider_shifts for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'doctor', 'admin')
  );
create policy "provider shifts: owner manage"
  on public.clinic_provider_shifts for all to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
    and exists (
      select 1 from public.clinic_providers p
      where p.id = provider_id and p.user_id = (select public.current_clinic_owner_id())
    )
  );

create policy "provider blocks: staff read"
  on public.clinic_provider_blocks for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'doctor', 'admin')
  );
create policy "provider blocks: owner manage"
  on public.clinic_provider_blocks for all to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
    and exists (
      select 1 from public.clinic_providers p
      where p.id = provider_id and p.user_id = (select public.current_clinic_owner_id())
    )
  );

create index if not exists clinic_providers_user_active_idx
  on public.clinic_providers (user_id, active);
create index if not exists clinic_appointment_types_user_active_idx
  on public.clinic_appointment_types (user_id, active);
create index if not exists clinic_provider_shifts_provider_weekday_idx
  on public.clinic_provider_shifts (provider_id, weekday);
create index if not exists clinic_provider_blocks_provider_time_idx
  on public.clinic_provider_blocks (provider_id, starts_at, ends_at);
create index if not exists appointments_provider_starts_at_idx
  on public.appointments (provider_id, starts_at)
  where provider_id is not null;

create or replace function public.book_clinic_appointment(
  p_patient_id uuid,
  p_provider_id uuid,
  p_appointment_type_id uuid,
  p_starts_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  clinic_role text := public.current_clinic_role();
  provider_row public.clinic_providers%rowtype;
  type_row public.clinic_appointment_types%rowtype;
  local_start timestamp;
  local_end timestamp;
  booking_id uuid;
begin
  if clinic_role not in ('owner', 'front_desk', 'admin', 'patient') then
    raise exception 'This role cannot book appointments.' using errcode = '42501';
  end if;

  if p_starts_at <= now() then
    raise exception 'Choose a future appointment time.' using errcode = '22023';
  end if;

  select * into provider_row
  from public.clinic_providers
  where id = p_provider_id and user_id = clinic_owner and active;
  if not found then
    raise exception 'Provider is unavailable.' using errcode = '22023';
  end if;

  select * into type_row
  from public.clinic_appointment_types
  where id = p_appointment_type_id and user_id = clinic_owner and active;
  if not found then
    raise exception 'Appointment type is unavailable.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.patients
    where id = p_patient_id and user_id = clinic_owner
      and (
        clinic_role <> 'patient'
        or auth_user_id = auth.uid()
      )
  ) then
    raise exception 'Patient is not part of this clinic.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(clinic_owner::text || ':' || p_provider_id::text, 0)
  );

  local_start := p_starts_at at time zone provider_row.time_zone;
  local_end := local_start + pg_catalog.make_interval(mins => type_row.duration_minutes);

  if not exists (
    select 1
    from public.clinic_provider_shifts s
    where s.provider_id = p_provider_id
      and s.user_id = clinic_owner
      and s.weekday = extract(dow from local_start)::smallint
      and local_start::time >= s.starts_at
      and local_end::time <= s.ends_at
      and local_start::date = local_end::date
  ) then
    raise exception 'The selected time is outside the provider shift.' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.clinic_provider_blocks b
    where b.provider_id = p_provider_id
      and b.user_id = clinic_owner
      and b.starts_at < p_starts_at + pg_catalog.make_interval(mins => type_row.duration_minutes)
      and b.ends_at > p_starts_at
  ) then
    raise exception 'The provider is unavailable during this time.' using errcode = '23P01';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.provider_id = p_provider_id
      and a.user_id = clinic_owner
      and a.status = 'booked'
      and a.starts_at < p_starts_at + pg_catalog.make_interval(mins => type_row.duration_minutes)
      and a.starts_at + pg_catalog.make_interval(mins => coalesce(a.duration_minutes, 30)) > p_starts_at
  ) then
    raise exception 'This time conflicts with another appointment.' using errcode = '23P01';
  end if;

  if (
    select count(*)
    from public.appointments a
    where a.provider_id = p_provider_id
      and a.user_id = clinic_owner
      and a.status = 'booked'
      and (a.starts_at at time zone provider_row.time_zone)::date = local_start::date
  ) >= provider_row.max_daily_appointments then
    raise exception 'The provider has reached the daily appointment limit.' using errcode = '23P01';
  end if;

  insert into public.appointments (
    patient_id, provider_id, appointment_type_id, duration_minutes, starts_at, status
  )
  values (
    p_patient_id, p_provider_id, p_appointment_type_id,
    type_row.duration_minutes, p_starts_at, 'booked'
  )
  returning id into booking_id;

  return booking_id;
end;
$$;

create or replace function public.update_clinic_appointment(
  p_appointment_id uuid,
  p_patient_id uuid,
  p_provider_id uuid,
  p_appointment_type_id uuid,
  p_starts_at timestamptz,
  p_status public.appointment_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  type_row public.clinic_appointment_types%rowtype;
  provider_row public.clinic_providers%rowtype;
  local_start timestamp;
  local_end timestamp;
begin
  if public.current_clinic_role() not in ('owner', 'front_desk', 'admin') then
    raise exception 'This role cannot update appointments.' using errcode = '42501';
  end if;
  if p_starts_at <= now() and p_status = 'booked' then
    raise exception 'Choose a future appointment time.' using errcode = '22023';
  end if;

  select t.* into type_row
  from public.clinic_appointment_types t
  where t.id = p_appointment_type_id and t.user_id = clinic_owner and t.active;
  if not found then
    raise exception 'Appointment type is unavailable.' using errcode = '22023';
  end if;
  select p.* into provider_row
  from public.clinic_providers p
  where p.id = p_provider_id and p.user_id = clinic_owner and p.active;
  if not found then
    raise exception 'Provider is unavailable.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.patients
    where id = p_patient_id and user_id = clinic_owner
  ) then
    raise exception 'Patient is not part of this clinic.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(clinic_owner::text || ':' || p_provider_id::text, 0)
  );

  if p_status = 'booked' then
    local_start := p_starts_at at time zone provider_row.time_zone;
    local_end := local_start + pg_catalog.make_interval(mins => type_row.duration_minutes);
    if not exists (
      select 1
      from public.clinic_provider_shifts s
      where s.provider_id = p_provider_id
        and s.user_id = clinic_owner
        and s.weekday = extract(dow from local_start)::smallint
        and local_start::time >= s.starts_at
        and local_end::time <= s.ends_at
        and local_start::date = local_end::date
    ) then
      raise exception 'The selected time is outside the provider shift.' using errcode = '23P01';
    end if;
    if exists (
      select 1 from public.clinic_provider_blocks b
      where b.provider_id = p_provider_id
        and b.user_id = clinic_owner
        and b.starts_at < p_starts_at + pg_catalog.make_interval(mins => type_row.duration_minutes)
        and b.ends_at > p_starts_at
    ) then
      raise exception 'The provider is unavailable during this time.' using errcode = '23P01';
    end if;
    if exists (
      select 1 from public.appointments a
      where a.provider_id = p_provider_id
        and a.user_id = clinic_owner
        and a.status = 'booked'
        and a.id <> p_appointment_id
        and a.starts_at < p_starts_at + pg_catalog.make_interval(mins => type_row.duration_minutes)
        and a.starts_at + pg_catalog.make_interval(mins => coalesce(a.duration_minutes, 30)) > p_starts_at
    ) then
      raise exception 'This time conflicts with another appointment.' using errcode = '23P01';
    end if;
    if (
      select count(*)
      from public.appointments a
      where a.provider_id = p_provider_id
        and a.user_id = clinic_owner
        and a.status = 'booked'
        and a.id <> p_appointment_id
        and (a.starts_at at time zone provider_row.time_zone)::date = local_start::date
    ) >= provider_row.max_daily_appointments then
      raise exception 'The provider has reached the daily appointment limit.' using errcode = '23P01';
    end if;
  end if;

  update public.appointments
  set patient_id = p_patient_id,
      provider_id = p_provider_id,
      appointment_type_id = p_appointment_type_id,
      duration_minutes = type_row.duration_minutes,
      starts_at = p_starts_at,
      status = p_status
  where id = p_appointment_id and user_id = clinic_owner;

  if not found then
    raise exception 'Appointment not found or access denied.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.book_clinic_appointment(uuid, uuid, uuid, timestamptz)
  from public;
revoke all on function public.update_clinic_appointment(uuid, uuid, uuid, uuid, timestamptz, public.appointment_status)
  from public;
grant execute on function public.book_clinic_appointment(uuid, uuid, uuid, timestamptz)
  to authenticated;
grant execute on function public.update_clinic_appointment(uuid, uuid, uuid, uuid, timestamptz, public.appointment_status)
  to authenticated;

revoke insert, update on public.appointments from authenticated;
grant select, delete on public.appointments to authenticated;

create or replace function public.doctor_can_access_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_clinic_role() = 'doctor'
    and exists (
      select 1
      from public.appointments a
      join public.clinic_providers p on p.id = a.provider_id
      where a.patient_id = p_patient_id
        and a.user_id = public.current_clinic_owner_id()
        and p.user_id = public.current_clinic_owner_id()
        and p.auth_user_id = auth.uid()
    )
$$;

create policy "patients: assigned doctor read"
  on public.patients for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.doctor_can_access_patient(id))
  );

create policy "appointments: assigned doctor read"
  on public.appointments for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and exists (
      select 1 from public.clinic_providers p
      where p.id = provider_id
        and p.user_id = (select public.current_clinic_owner_id())
        and p.auth_user_id = auth.uid()
    )
  );

revoke all on function public.doctor_can_access_patient(uuid) from public;
grant execute on function public.doctor_can_access_patient(uuid) to authenticated;
