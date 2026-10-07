create table if not exists public.clinic_patient_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id)
);

alter table public.clinic_patient_access_requests enable row level security;
revoke all on public.clinic_patient_access_requests from anon, authenticated;
grant select on public.clinic_patient_access_requests to authenticated;

drop policy if exists "patient access requests: owner/admin read"
  on public.clinic_patient_access_requests;
create policy "patient access requests: owner/admin read"
  on public.clinic_patient_access_requests for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin')
  );

create or replace function public.create_clinic_patient_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner_ids uuid[];
  clinic_owner_count integer;
  patient_name text;
begin
  if coalesce(
    new.raw_user_meta_data ->> 'family_clinic_patient_signup',
    ''
  ) <> 'true' then
    return new;
  end if;

  patient_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if length(patient_name) < 2 or length(patient_name) > 160 then
    raise exception 'Patient registration requires a valid full name.'
      using errcode = '22023';
  end if;

  select count(*)::integer, array_agg(u.id order by u.created_at)
  into clinic_owner_count, clinic_owner_ids
  from auth.users u
  where u.raw_app_meta_data ->> 'clinic_role' = 'owner';

  if clinic_owner_count <> 1 then
    raise exception
      'Patient registration requires exactly one Auth user with clinic_role owner; found %.',
      clinic_owner_count
      using errcode = '55000';
  end if;

  insert into public.clinic_patient_access_requests (
    user_id,
    auth_user_id,
    full_name,
    email
  )
  values (
    clinic_owner_ids[1],
    new.id,
    patient_name,
    coalesce(new.email, '')
  );

  return new;
end;
$$;

revoke all on function public.create_clinic_patient_on_signup() from public;

drop trigger if exists on_auth_user_created_clinic_patient on auth.users;
create trigger on_auth_user_created_clinic_patient
  after insert on auth.users
  for each row execute function public.create_clinic_patient_on_signup();

create or replace function public.approve_clinic_patient_access(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  actor_id uuid := auth.uid();
  request_row public.clinic_patient_access_requests%rowtype;
  existing_patient_id uuid;
  existing_auth_user_id uuid;
begin
  if actor_id is null
    or public.current_clinic_role() not in ('owner', 'admin')
    or clinic_owner is null then
    raise exception 'Only clinic owners or administrators can approve patient access.'
      using errcode = '42501';
  end if;

  select * into request_row
  from public.clinic_patient_access_requests r
  where r.id = p_request_id
    and r.user_id = clinic_owner
    and r.status = 'pending'
  for update;

  if not found then
    raise exception 'Pending patient access request not found.'
      using errcode = 'P0002';
  end if;

  select p.id, p.auth_user_id
  into existing_patient_id, existing_auth_user_id
  from public.patients p
  where p.user_id = clinic_owner
    and lower(p.email) = lower(request_row.email)
  order by p.created_at
  limit 1
  for update;

  if existing_patient_id is not null then
    if existing_auth_user_id is not null
      and existing_auth_user_id <> request_row.auth_user_id then
      raise exception 'A matching patient record is already linked to another account.'
        using errcode = '23505';
    end if;

    update public.patients
    set auth_user_id = request_row.auth_user_id
    where id = existing_patient_id;
  else
    insert into public.patients (
      user_id,
      full_name,
      email,
      auth_user_id
    )
    values (
      clinic_owner,
      request_row.full_name,
      request_row.email,
      request_row.auth_user_id
    );
  end if;

  update auth.users
  set raw_app_meta_data =
    (coalesce(raw_app_meta_data, '{}'::jsonb) - 'clinic_access_status')
    || jsonb_build_object(
      'clinic_role', 'patient',
      'clinic_owner_id', clinic_owner::text
    )
  where id = request_row.auth_user_id;

  update public.clinic_patient_access_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = actor_id
  where id = request_row.id;
end;
$$;

create or replace function public.deny_clinic_patient_access(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  actor_id uuid := auth.uid();
  request_row public.clinic_patient_access_requests%rowtype;
begin
  if actor_id is null
    or public.current_clinic_role() not in ('owner', 'admin')
    or clinic_owner is null then
    raise exception 'Only clinic owners or administrators can deny patient access.'
      using errcode = '42501';
  end if;

  select * into request_row
  from public.clinic_patient_access_requests r
  where r.id = p_request_id
    and r.user_id = clinic_owner
    and r.status = 'pending'
  for update;

  if not found then
    raise exception 'Pending patient access request not found.'
      using errcode = 'P0002';
  end if;

  update auth.users
  set raw_app_meta_data =
    (coalesce(raw_app_meta_data, '{}'::jsonb)
      - 'clinic_role' - 'clinic_owner_id')
    || jsonb_build_object('clinic_access_status', 'denied')
  where id = request_row.auth_user_id;

  update public.clinic_patient_access_requests
  set status = 'denied',
      reviewed_at = now(),
      reviewed_by = actor_id
  where id = request_row.id;
end;
$$;

revoke all on function public.approve_clinic_patient_access(uuid) from public;
revoke all on function public.deny_clinic_patient_access(uuid) from public;
grant execute on function public.approve_clinic_patient_access(uuid) to authenticated;
grant execute on function public.deny_clinic_patient_access(uuid) to authenticated;
