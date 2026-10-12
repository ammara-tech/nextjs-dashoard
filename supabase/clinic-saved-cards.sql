-- Saved card wallet. Stores only non-sensitive card metadata (never full
-- card numbers or CVV). Run after clinic-platform.sql.
create table if not exists public.clinic_saved_cards (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  auth_user_id uuid not null default auth.uid() references auth.users (id),
  cardholder_name text not null check (length(trim(cardholder_name)) > 0),
  brand text not null,
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month smallint not null check (exp_month between 1 and 12),
  exp_year smallint not null check (exp_year between 2000 and 2100),
  nickname text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists clinic_saved_cards_user_idx
  on public.clinic_saved_cards (auth_user_id);

alter table public.clinic_saved_cards enable row level security;

revoke all on public.clinic_saved_cards from anon, authenticated;
grant select, insert, update, delete on public.clinic_saved_cards to authenticated;

-- auth_user_id is compared directly so no policy touches the patients table.
drop policy if exists "saved cards: own" on public.clinic_saved_cards;
create policy "saved cards: own"
  on public.clinic_saved_cards for all to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));
