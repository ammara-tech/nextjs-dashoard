-- Medical aid & co-payment. Run after clinic-platform.sql.

create table if not exists public.medical_aid_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  switch_code text not null,
  plans text[] not null default '{}',
  active boolean not null default true
);

alter table public.medical_aid_providers enable row level security;

drop policy if exists "medical aid providers: read" on public.medical_aid_providers;
create policy "medical aid providers: read"
  on public.medical_aid_providers for select to authenticated
  using (active);

insert into public.medical_aid_providers (name, switch_code, plans) values
  ('Discovery Health', 'DISC', array['KeyCare Plus', 'Classic Smart', 'Essential Smart']),
  ('Momentum', 'MOME', array['Momentum Custom', 'Access', 'MediPlus']),
  ('Bonitas', 'BONI', array['BonComprehensive', 'BonEssential', 'BonClassic'])
on conflict (name) do nothing;

create table if not exists public.patient_insurance_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  patient_id uuid not null references public.patients (id),
  dependent_label text not null default 'Primary member',
  provider_id uuid not null references public.medical_aid_providers (id),
  plan text not null,
  -- AES-256-GCM ciphertext produced by the server; never plaintext.
  member_id_encrypted text not null,
  member_id_last4 text not null,
  membership_number_encrypted text,
  card_object_path text,
  status text not null default 'pending'
    check (status in ('verified', 'pending', 'check-coverage')),
  switch_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, dependent_label)
);

alter table public.patient_insurance_profiles enable row level security;

drop policy if exists "insurance: patient read own" on public.patient_insurance_profiles;
create policy "insurance: patient read own"
  on public.patient_insurance_profiles for select to authenticated
  using (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "insurance: patient write own" on public.patient_insurance_profiles;
create policy "insurance: patient write own"
  on public.patient_insurance_profiles for insert to authenticated
  with check (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "insurance: patient update own" on public.patient_insurance_profiles;
create policy "insurance: patient update own"
  on public.patient_insurance_profiles for update to authenticated
  using (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "insurance: staff read" on public.patient_insurance_profiles;
create policy "insurance: staff read"
  on public.patient_insurance_profiles for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  );

drop policy if exists "insurance: admin review" on public.patient_insurance_profiles;
create policy "insurance: admin review"
  on public.patient_insurance_profiles for update to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin')
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin')
  );

-- Medical card images/PDFs: pt_<patient uuid>/medical_cards/<file>
drop policy if exists "medical cards: patient upload" on storage.objects;
create policy "medical cards: patient upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patients-medical-records'
    and (select public.current_clinic_role()) = 'patient'
    and split_part(name, '/', 2) = 'medical_cards'
    and split_part(name, '/', 3) <> ''
    and split_part(name, '/', 4) = ''
    and exists (
      select 1 from public.patients p
      where p.auth_user_id = (select auth.uid())
        and split_part(name, '/', 1) = 'pt_' || p.id::text
    )
  );

drop policy if exists "medical cards: authorized read" on storage.objects;
create policy "medical cards: authorized read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'patients-medical-records'
    and split_part(name, '/', 2) = 'medical_cards'
    and exists (
      select 1 from public.patient_insurance_profiles i
      where i.card_object_path = name
    )
  );
