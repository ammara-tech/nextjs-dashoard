-- Family Clinic Care Plans: plans, patient memberships and payment records.
-- Run after clinic-platform.sql and clinic-saved-cards.sql.
--
-- Patients never write these tables directly. They call the functions at the
-- bottom (enrol_in_care_plan, change_care_plan_card, cancel_care_plan), which
-- check ownership and take the price from clinic_care_plans, not from the
-- browser.
--
-- IMPORTANT: no payment gateway is connected yet. enrol_in_care_plan records a
-- DEMO payment (is_demo = true) against the chosen saved card; no money moves
-- and no recurring debit runs. Replace it with a gateway call before taking
-- real payments.

create table if not exists public.clinic_care_plans (
  code text primary key,
  name text not null,
  tagline text not null,
  price_minor integer not null check (price_minor > 0),
  currency text not null default 'ZAR',
  active boolean not null default true
);

insert into public.clinic_care_plans (code, name, tagline, price_minor) values
  ('essential', 'Essential', 'Everyday care for one person', 19900),
  ('family-plus', 'Family Plus', 'Cover for the whole household', 54900),
  ('premium', 'Premium', 'Full-service care and extras', 89900)
on conflict (code) do update
  set name = excluded.name,
      tagline = excluded.tagline,
      price_minor = excluded.price_minor;

create table if not exists public.clinic_care_plan_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  patient_id uuid not null references public.patients (id),
  plan_code text not null references public.clinic_care_plans (code),
  -- The saved card the plan is debited from. Set null if the card is removed.
  card_id uuid references public.clinic_saved_cards (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  started_at timestamptz not null default now(),
  next_debit_on date,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

-- A patient can hold only one active plan at a time.
create unique index if not exists clinic_care_plan_one_active_idx
  on public.clinic_care_plan_memberships (patient_id)
  where status = 'active';

create table if not exists public.clinic_care_plan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  membership_id uuid not null references public.clinic_care_plan_memberships (id),
  patient_id uuid not null references public.patients (id),
  plan_code text not null references public.clinic_care_plans (code),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'ZAR',
  -- Only the card type and last 4 digits are kept, never the full number.
  card_brand text,
  card_last4 text,
  status text not null default 'paid' check (status in ('paid', 'failed', 'refunded')),
  is_demo boolean not null default true,
  reference text not null,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

create index if not exists clinic_care_plan_payments_patient_idx
  on public.clinic_care_plan_payments (patient_id, created_at desc);

alter table public.clinic_care_plans enable row level security;
alter table public.clinic_care_plan_memberships enable row level security;
alter table public.clinic_care_plan_payments enable row level security;

revoke all on public.clinic_care_plans, public.clinic_care_plan_memberships,
  public.clinic_care_plan_payments from anon, authenticated;
grant select on public.clinic_care_plans, public.clinic_care_plan_memberships,
  public.clinic_care_plan_payments to authenticated;

drop policy if exists "care plans: read" on public.clinic_care_plans;
create policy "care plans: read"
  on public.clinic_care_plans for select to authenticated
  using (active);

drop policy if exists "care plan memberships: patient read own" on public.clinic_care_plan_memberships;
create policy "care plan memberships: patient read own"
  on public.clinic_care_plan_memberships for select to authenticated
  using (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "care plan memberships: staff read" on public.clinic_care_plan_memberships;
create policy "care plan memberships: staff read"
  on public.clinic_care_plan_memberships for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  );

drop policy if exists "care plan payments: patient read own" on public.clinic_care_plan_payments;
create policy "care plan payments: patient read own"
  on public.clinic_care_plan_payments for select to authenticated
  using (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "care plan payments: staff read" on public.clinic_care_plan_payments;
create policy "care plan payments: staff read"
  on public.clinic_care_plan_payments for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  );

-- Join a plan, debited from one of the patient's saved cards.
create or replace function public.enrol_in_care_plan(p_plan_code text, p_card_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_patient public.patients%rowtype;
  v_plan public.clinic_care_plans%rowtype;
  v_card public.clinic_saved_cards%rowtype;
  v_membership uuid;
  v_next date := (current_date + interval '1 month')::date;
begin
  if v_uid is null or public.current_clinic_role() <> 'patient' then
    raise exception 'Only patients can join a care plan.';
  end if;

  select * into v_patient from public.patients where auth_user_id = v_uid limit 1;
  if not found then
    raise exception 'Your patient account is not linked.';
  end if;

  select * into v_plan from public.clinic_care_plans where code = p_plan_code and active;
  if not found then
    raise exception 'That plan is not available.';
  end if;

  select * into v_card from public.clinic_saved_cards
  where id = p_card_id and auth_user_id = v_uid;
  if not found then
    raise exception 'Choose one of your saved cards.';
  end if;
  if (v_card.exp_year, v_card.exp_month) <
     (extract(year from current_date)::int, extract(month from current_date)::int) then
    raise exception 'That card has expired. Save a current card first.';
  end if;

  if exists (
    select 1 from public.clinic_care_plan_memberships
    where patient_id = v_patient.id and status = 'active'
  ) then
    raise exception 'You already have an active care plan. Cancel it before choosing another.';
  end if;

  insert into public.clinic_care_plan_memberships
    (user_id, patient_id, plan_code, card_id, status, next_debit_on)
  values
    (v_patient.user_id, v_patient.id, v_plan.code, v_card.id, 'active', v_next)
  returning id into v_membership;

  -- DEMO payment record: no money is taken.
  insert into public.clinic_care_plan_payments
    (user_id, membership_id, patient_id, plan_code, amount_minor, currency,
     card_brand, card_last4, status, is_demo, reference, period_start, period_end)
  values
    (v_patient.user_id, v_membership, v_patient.id, v_plan.code, v_plan.price_minor,
     v_plan.currency, v_card.brand, v_card.last4, 'paid', true,
     'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
     current_date, v_next - 1);

  return v_membership;
end;
$$;

-- Change which saved card the active plan is debited from.
create or replace function public.change_care_plan_card(p_card_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_patient_id uuid;
  v_card public.clinic_saved_cards%rowtype;
begin
  if v_uid is null or public.current_clinic_role() <> 'patient' then
    raise exception 'Only patients can change their plan card.';
  end if;
  select id into v_patient_id from public.patients where auth_user_id = v_uid limit 1;
  if v_patient_id is null then
    raise exception 'Your patient account is not linked.';
  end if;
  select * into v_card from public.clinic_saved_cards
  where id = p_card_id and auth_user_id = v_uid;
  if not found then
    raise exception 'Choose one of your saved cards.';
  end if;
  if (v_card.exp_year, v_card.exp_month) <
     (extract(year from current_date)::int, extract(month from current_date)::int) then
    raise exception 'That card has expired.';
  end if;
  update public.clinic_care_plan_memberships
  set card_id = v_card.id
  where patient_id = v_patient_id and status = 'active';
  if not found then
    raise exception 'You do not have an active care plan.';
  end if;
end;
$$;

-- Cancel the active plan. Payment history is kept.
create or replace function public.cancel_care_plan()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_patient_id uuid;
begin
  if v_uid is null or public.current_clinic_role() <> 'patient' then
    raise exception 'Only patients can cancel their plan.';
  end if;
  select id into v_patient_id from public.patients where auth_user_id = v_uid limit 1;
  if v_patient_id is null then
    raise exception 'Your patient account is not linked.';
  end if;
  update public.clinic_care_plan_memberships
  set status = 'cancelled', cancelled_at = now(), next_debit_on = null
  where patient_id = v_patient_id and status = 'active';
  if not found then
    raise exception 'You do not have an active care plan.';
  end if;
end;
$$;

revoke all on function public.enrol_in_care_plan(text, uuid) from public;
revoke all on function public.change_care_plan_card(uuid) from public;
revoke all on function public.cancel_care_plan() from public;
grant execute on function public.enrol_in_care_plan(text, uuid) to authenticated;
grant execute on function public.change_care_plan_card(uuid) to authenticated;
grant execute on function public.cancel_care_plan() to authenticated;
