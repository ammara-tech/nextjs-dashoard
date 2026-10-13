-- Medical aid claim tracking: members submit claims and clinic staff move them
-- through Submitted -> In review -> Approved or Rejected -> Paid.
--
-- Run once in the Supabase SQL editor after clinic-platform.sql and
-- clinic-care-plans.sql. Safe to re-run.
--
-- Patients and staff never write the table directly. They call submit_claim
-- (patients only) and set_claim_status (owner, admin and front desk only), which
-- check who is asking and which clinic the claim belongs to.

create table if not exists public.clinic_claims (
  id uuid primary key default gen_random_uuid(),
  -- The clinic owner the claim belongs to, same as every other clinic table.
  user_id uuid not null references auth.users (id),
  patient_id uuid not null references public.patients (id),
  reference text not null,
  description text not null check (char_length(description) between 3 and 200),
  amount_minor integer not null check (amount_minor > 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'approved', 'rejected', 'paid')),
  decision_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists clinic_claims_patient_idx
  on public.clinic_claims (patient_id, submitted_at desc);
create index if not exists clinic_claims_clinic_status_idx
  on public.clinic_claims (user_id, status);

alter table public.clinic_claims enable row level security;
revoke all on public.clinic_claims from anon, authenticated;
grant select on public.clinic_claims to authenticated;

drop policy if exists "claims: patient read own" on public.clinic_claims;
create policy "claims: patient read own"
  on public.clinic_claims for select to authenticated
  using (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "claims: staff read" on public.clinic_claims;
create policy "claims: staff read"
  on public.clinic_claims for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  );

-- A patient submits a claim for themselves. The amount is in cents.
create or replace function public.submit_claim(
  p_description text,
  p_amount_minor integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_patient public.patients%rowtype;
  v_id uuid;
begin
  if v_uid is null or public.current_clinic_role() is distinct from 'patient' then
    raise exception 'Only patients can submit a claim.' using errcode = 'P0001';
  end if;

  select * into v_patient from public.patients where auth_user_id = v_uid limit 1;
  if not found then
    raise exception 'Your patient account is not linked.' using errcode = 'P0001';
  end if;

  if p_description is null or char_length(trim(p_description)) < 3 then
    raise exception 'Describe what the claim is for.' using errcode = 'P0001';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 100000000 then
    raise exception 'Enter an amount greater than zero.' using errcode = 'P0001';
  end if;

  insert into public.clinic_claims (user_id, patient_id, reference, description, amount_minor)
  values (
    v_patient.user_id,
    v_patient.id,
    'CLM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    left(trim(p_description), 200),
    p_amount_minor
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Staff move a claim to its next stage. Only these moves are allowed:
--   submitted -> in_review or rejected
--   in_review -> approved or rejected
--   approved  -> paid
create or replace function public.set_claim_status(
  p_claim_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.current_clinic_owner_id();
  v_role text := public.current_clinic_role();
  v_claim public.clinic_claims%rowtype;
begin
  if v_role is null or v_role not in ('owner', 'admin', 'front_desk') then
    raise exception 'Only clinic staff can update a claim.' using errcode = 'P0001';
  end if;

  select * into v_claim from public.clinic_claims
  where id = p_claim_id and user_id = v_owner;
  if not found then
    raise exception 'That claim was not found.' using errcode = 'P0001';
  end if;

  if not (
    (v_claim.status = 'submitted' and p_status in ('in_review', 'rejected')) or
    (v_claim.status = 'in_review' and p_status in ('approved', 'rejected')) or
    (v_claim.status = 'approved' and p_status = 'paid')
  ) then
    raise exception 'A % claim cannot be moved to %.', v_claim.status, p_status
      using errcode = 'P0001';
  end if;

  update public.clinic_claims
  set status = p_status,
      decision_note = coalesce(nullif(trim(p_note), ''), decision_note),
      updated_at = now(),
      paid_at = case when p_status = 'paid' then now() else paid_at end
  where id = v_claim.id;
end;
$$;

revoke all on function public.submit_claim(text, integer) from public;
revoke all on function public.set_claim_status(uuid, text, text) from public;
grant execute on function public.submit_claim(text, integer) to authenticated;
grant execute on function public.set_claim_status(uuid, text, text) to authenticated;

-- Sample claims so the board is not empty in the demo. Added only while the
-- table is empty, for the first few patients that exist.
insert into public.clinic_claims
  (user_id, patient_id, reference, description, amount_minor, status, decision_note,
   submitted_at, updated_at, paid_at)
select
  p.user_id,
  p.id,
  'CLM-DEMO' || lpad(p.rn::text, 4, '0'),
  (array[
    'GP consultation and blood test',
    'Dental check-up and cleaning',
    'Prescription medication',
    'Optometrist: eye test',
    'Physiotherapy session'
  ])[p.rn],
  (array[145000, 98000, 62500, 78000, 112000])[p.rn],
  (array['paid', 'approved', 'in_review', 'submitted', 'rejected'])[p.rn],
  case when p.rn = 5 then 'Not covered under this plan' else null end,
  now() - (p.rn * interval '3 days'),
  now() - (p.rn * interval '2 days'),
  case when p.rn = 1 then now() - interval '1 day' else null end
from (
  select id, user_id, row_number() over (order by created_at) as rn
  from public.patients
  where archived_at is null
  limit 5
) p
where not exists (select 1 from public.clinic_claims);
