insert into storage.buckets (id, name, public)
values ('patients-medical-records', 'patients-medical-records', false)
on conflict (id) do update set public = false;

alter table public.patients
  add column if not exists auth_user_id uuid references auth.users (id),
  add column if not exists patient_number text,
  add column if not exists email text,
  add column if not exists avatar_path text,
  add column if not exists archived_at timestamptz;

drop policy if exists "patients: owner delete" on public.patients;
drop policy if exists "appointments: owner delete" on public.appointments;
revoke delete on public.patients, public.appointments, public.treatments
  from authenticated;

create or replace function public.assign_patient_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.patient_number is null then
    new.patient_number := 'PT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  end if;
  return new;
end;
$$;

create trigger patients_assign_patient_number
  before insert on public.patients
  for each row execute function public.assign_patient_number();

create or replace function public.protect_patient_identity_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.patient_number is distinct from old.patient_number then
    raise exception 'Clinic ownership and patient numbers cannot be changed.'
      using errcode = '42501';
  end if;
  if (
    new.auth_user_id is distinct from old.auth_user_id
    or new.archived_at is distinct from old.archived_at
    or new.avatar_path is distinct from old.avatar_path
  ) and public.current_clinic_role() not in ('owner', 'admin') then
    raise exception 'Only clinic owners or administrators can change patient account links or archive records.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger patients_protect_identity_fields
  before update on public.patients
  for each row execute function public.protect_patient_identity_fields();

update public.patients
set patient_number = 'PT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where patient_number is null;

create unique index if not exists patients_auth_user_id_unique
  on public.patients (auth_user_id)
  where auth_user_id is not null;
create unique index if not exists patients_user_patient_number_unique
  on public.patients (user_id, patient_number)
  where patient_number is not null;

create policy "patients: linked patient read own profile"
  on public.patients for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and auth_user_id = (select auth.uid())
    and (select public.current_clinic_role()) = 'patient'
  );

create policy "appointments: linked patient read own bookings"
  on public.appointments for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

create policy "appointments: staff can read queue"
  on public.appointments for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'admin')
  );

create policy "patients: clinic admin read"
  on public.patients for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'admin'
  );
create policy "patients: clinic admin insert"
  on public.patients for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'admin'
  );
create policy "patients: clinic admin update"
  on public.patients for update to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'admin'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'admin'
  );
create policy "patients: clinic admin delete"
  on public.patients for delete to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'admin'
  );

create policy "appointments: clinic admin manage"
  on public.appointments for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'admin'
  );

create table if not exists public.clinic_patient_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  patient_id uuid not null references public.patients (id),
  object_path text not null unique,
  category text not null check (category in ('identity', 'clinical_history', 'invoices')),
  original_name text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size between 1 and 20971520),
  uploaded_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.clinic_patient_documents enable row level security;
revoke all on public.clinic_patient_documents from anon, authenticated;
grant select, insert, update on public.clinic_patient_documents to authenticated;

create policy "clinic documents: authorized read"
  on public.clinic_patient_documents for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (
      (select public.current_clinic_role()) in ('owner', 'admin')
      or (
        (select public.current_clinic_role()) = 'front_desk'
        and category in ('identity', 'invoices')
      )
      or (
        (select public.current_clinic_role()) = 'doctor'
        and (select public.doctor_can_access_patient(patient_id))
      )
      or exists (
        select 1 from public.patients p
        where p.id = patient_id and p.auth_user_id = auth.uid()
          and (select public.current_clinic_role()) = 'patient'
      )
    )
  );

create policy "clinic documents: staff upload"
  on public.clinic_patient_documents for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and uploaded_by = (select auth.uid())
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'doctor')
    and (
      (select public.current_clinic_role()) <> 'front_desk'
      or category in ('identity', 'invoices')
    )
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.user_id = (select public.current_clinic_owner_id())
    )
    and (
      (select public.current_clinic_role()) <> 'doctor'
      or (select public.doctor_can_access_patient(patient_id))
    )
    and split_part(object_path, '/', 1) = 'pt_' || patient_id::text
    and split_part(object_path, '/', 2) = category
    and split_part(object_path, '/', 3) <> ''
    and split_part(object_path, '/', 4) = ''
  );

create policy "clinic documents: owner archive"
  on public.clinic_patient_documents for update to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'owner'
  );

create policy "patient records objects: authorized read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'patients-medical-records'
    and exists (
      select 1 from public.clinic_patient_documents d
      where d.object_path = name and d.archived_at is null
        and d.user_id = (select public.current_clinic_owner_id())
        and (
          (select public.current_clinic_role()) in ('owner', 'admin')
          or (
            (select public.current_clinic_role()) = 'front_desk'
            and d.category in ('identity', 'invoices')
          )
          or (
            (select public.current_clinic_role()) = 'doctor'
            and (select public.doctor_can_access_patient(d.patient_id))
          )
          or exists (
            select 1 from public.patients p
            where p.id = d.patient_id and p.auth_user_id = (select auth.uid())
              and (select public.current_clinic_role()) = 'patient'
          )
        )
    )
  );

create policy "patient records objects: authorized upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patients-medical-records'
    and (select public.current_clinic_role()) in ('owner', 'front_desk', 'doctor')
    and exists (
      select 1 from public.patients p
      where p.user_id = (select public.current_clinic_owner_id())
        and split_part(name, '/', 1) = 'pt_' || p.id::text
        and split_part(name, '/', 3) <> ''
        and split_part(name, '/', 4) = ''
        and (
          (select public.current_clinic_role()) <> 'front_desk'
          or split_part(name, '/', 2) in ('identity', 'invoices')
        )
        and (
          (select public.current_clinic_role()) <> 'doctor'
          or (select public.doctor_can_access_patient(p.id))
        )
    )
  );

create table if not exists public.clinic_encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  appointment_id uuid not null unique references public.appointments (id),
  patient_id uuid not null references public.patients (id),
  provider_id uuid not null references public.clinic_providers (id),
  status text not null default 'draft' check (status in ('draft', 'signed')),
  created_by uuid not null default auth.uid() references auth.users (id),
  signed_by uuid references auth.users (id),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'draft' and signed_at is null and signed_by is null)
    or (status = 'signed' and signed_at is not null and signed_by is not null)
  )
);

create table if not exists public.clinic_encounter_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  encounter_id uuid not null references public.clinic_encounters (id),
  note_type text not null check (note_type in ('draft', 'signed', 'addendum')),
  body text not null check (length(trim(body)) > 0),
  author_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.clinic_encounters enable row level security;
alter table public.clinic_encounter_notes enable row level security;
revoke all on public.clinic_encounters, public.clinic_encounter_notes
  from anon, authenticated;
grant select, insert, update on public.clinic_encounters to authenticated;
grant select, insert on public.clinic_encounter_notes to authenticated;

create policy "clinical encounters: assigned staff read"
  on public.clinic_encounters for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (
      (select public.current_clinic_role()) in ('owner', 'admin')
      or exists (
        select 1 from public.clinic_providers p
        where p.id = provider_id and p.auth_user_id = (select auth.uid())
      )
    )
  );

create policy "clinical encounters: assigned doctor create"
  on public.clinic_encounters for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and created_by = (select auth.uid())
    and (select public.current_clinic_role()) = 'doctor'
    and exists (
      select 1 from public.clinic_providers p
      where p.id = provider_id and p.user_id = user_id
        and p.auth_user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.patients pt
      where pt.id = patient_id and pt.user_id = user_id
    )
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.patient_id = patient_id
        and a.provider_id = provider_id and a.user_id = user_id
    )
  );

create policy "clinical encounters: doctor signs own"
  on public.clinic_encounters for update to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'doctor'
    and exists (
      select 1 from public.clinic_providers p
      where p.id = provider_id and p.auth_user_id = (select auth.uid())
    )
    and status = 'draft'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'doctor'
    and exists (
      select 1 from public.clinic_providers p
      where p.id = provider_id and p.auth_user_id = (select auth.uid())
    )
    and (
      (status = 'draft' and signed_at is null and signed_by is null)
      or (status = 'signed' and signed_at is not null and signed_by = (select auth.uid()))
    )
  );

create policy "clinical notes: assigned staff read"
  on public.clinic_encounter_notes for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and exists (
      select 1 from public.clinic_encounters e
      where e.id = encounter_id and e.user_id = user_id
        and (
          (select public.current_clinic_role()) in ('owner', 'admin')
          or exists (
            select 1 from public.clinic_providers p
            where p.id = e.provider_id and p.auth_user_id = (select auth.uid())
          )
        )
    )
  );

create policy "clinical notes: doctor draft or addendum"
  on public.clinic_encounter_notes for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and author_id = (select auth.uid())
    and (select public.current_clinic_role()) = 'doctor'
    and exists (
      select 1 from public.clinic_encounters e
      join public.clinic_providers p on p.id = e.provider_id
      where e.id = encounter_id and e.user_id = user_id
        and p.auth_user_id = (select auth.uid())
        and exists (
          select 1 from public.appointments a
          where a.id = e.appointment_id and a.patient_id = e.patient_id
            and a.provider_id = e.provider_id and a.user_id = e.user_id
        )
        and (
          (note_type = 'draft' and e.status = 'draft')
          or (note_type = 'addendum' and e.status = 'signed')
        )
    )
  );

create table if not exists public.clinic_audit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  actor_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

alter table public.clinic_audit_events enable row level security;
revoke all on public.clinic_audit_events from anon, authenticated;
grant select, insert on public.clinic_audit_events to authenticated;
create policy "clinic audit: owner read"
  on public.clinic_audit_events for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin')
  );
create policy "clinic audit: clinic actor append"
  on public.clinic_audit_events for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and actor_id = (select auth.uid())
  );

create table if not exists public.clinic_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  patient_id uuid not null references public.patients (id),
  appointment_id uuid references public.appointments (id),
  amount_minor integer not null check (amount_minor > 0),
  currency char(3) not null,
  method text not null check (method in ('online', 'in_person')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refund_pending', 'refunded')),
  provider_reference text,
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_wallet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  patient_id uuid not null references public.patients (id),
  payment_id uuid references public.clinic_payments (id),
  amount_minor integer not null check (amount_minor <> 0),
  reason text not null,
  idempotency_key text not null,
  actor_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.clinic_inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  name text not null,
  sku text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, sku)
);

create table if not exists public.clinic_inventory_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  item_id uuid not null references public.clinic_inventory_items (id),
  batch_number text not null,
  expires_on date,
  quantity integer not null check (quantity >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  encounter_id uuid not null references public.clinic_encounters (id),
  patient_id uuid not null references public.patients (id),
  prescribed_by uuid not null references auth.users (id),
  medication text not null,
  instructions text not null,
  status text not null default 'issued'
    check (status in ('issued', 'dispensed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.current_clinic_owner_id()
    references auth.users (id),
  patient_id uuid not null references public.patients (id),
  subject text not null check (length(trim(subject)) between 1 and 160),
  message text not null check (length(trim(message)) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clinic_payments',
    'clinic_wallet_entries',
    'clinic_inventory_items',
    'clinic_inventory_batches',
    'clinic_prescriptions',
    'clinic_support_requests'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update on public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select public.current_clinic_owner_id()) and (select public.current_clinic_role()) in (''owner'', ''admin'')) with check (user_id = (select public.current_clinic_owner_id()) and (select public.current_clinic_role()) in (''owner'', ''admin''))',
      table_name || ': admin access',
      table_name
    );
  end loop;
end $$;

create policy "support requests: patient create own"
  on public.clinic_support_requests for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'patient'
    and status = 'open'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

create policy "support requests: patient read own"
  on public.clinic_support_requests for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

create policy "support requests: front desk queue"
  on public.clinic_support_requests for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  );

create policy "support requests: staff update status"
  on public.clinic_support_requests for update to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'front_desk')
  );

revoke update on public.clinic_support_requests from authenticated;
grant update (status) on public.clinic_support_requests to authenticated;

create policy "payments: patient read own"
  on public.clinic_payments for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (
      (select public.current_clinic_role()) in ('owner', 'admin')
      or ((select public.current_clinic_role()) = 'patient' and exists (
        select 1 from public.patients p
        where p.id = patient_id and p.auth_user_id = (select auth.uid())
      ))
      or ((select public.current_clinic_role()) = 'front_desk' and method = 'in_person')
    )
  );

create policy "payments: staff record in person"
  on public.clinic_payments for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and method = 'in_person'
    and status = 'paid'
    and recorded_by = (select auth.uid())
    and (select public.current_clinic_role()) in ('owner', 'front_desk')
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.user_id = (select public.current_clinic_owner_id())
    )
  );

create policy "wallet: patient read own"
  on public.clinic_wallet_entries for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (
      (select public.current_clinic_role()) in ('owner', 'admin')
      or ((select public.current_clinic_role()) = 'patient' and exists (
        select 1 from public.patients p
        where p.id = patient_id and p.auth_user_id = (select auth.uid())
      ))
    )
  );

create policy "inventory: stock roles access"
  on public.clinic_inventory_items for all to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'stock_manager', 'pharmacist')
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'stock_manager', 'pharmacist')
  );

create policy "inventory batches: stock roles access"
  on public.clinic_inventory_batches for all to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'stock_manager', 'pharmacist')
    and exists (
      select 1 from public.clinic_inventory_items i
      where i.id = item_id and i.user_id = user_id
    )
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('owner', 'admin', 'stock_manager', 'pharmacist')
    and exists (
      select 1 from public.clinic_inventory_items i
      where i.id = item_id and i.user_id = user_id
    )
  );

create policy "prescriptions: clinical and pharmacy roles read"
  on public.clinic_prescriptions for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (
      (select public.current_clinic_role()) in ('owner', 'admin', 'doctor', 'pharmacist')
      or ((select public.current_clinic_role()) = 'patient' and exists (
        select 1 from public.patients p
        where p.id = patient_id and p.auth_user_id = (select auth.uid())
      ))
    )
  );

create policy "prescriptions: patient read own"
  on public.clinic_prescriptions for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.auth_user_id = (select auth.uid())
    )
  );

create policy "prescriptions: assigned doctor issue"
  on public.clinic_prescriptions for insert to authenticated
  with check (
    user_id = (select public.current_clinic_owner_id())
    and prescribed_by = (select auth.uid())
    and (select public.current_clinic_role()) = 'doctor'
    and exists (
      select 1 from public.clinic_encounters e
      join public.clinic_providers p on p.id = e.provider_id
      where e.id = encounter_id and e.patient_id = patient_id
        and e.status = 'signed' and p.auth_user_id = (select auth.uid())
    )
  );

create policy "prescriptions: pharmacist dispense"
  on public.clinic_prescriptions for update to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'pharmacist'
    and status = 'issued'
  )
  with check (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'pharmacist'
    and status in ('dispensed', 'cancelled')
  );

revoke update, delete on public.clinic_inventory_items,
  public.clinic_inventory_batches from authenticated;
grant select, insert on public.clinic_inventory_items,
  public.clinic_inventory_batches to authenticated;

revoke update on public.clinic_prescriptions from authenticated;
grant update (status) on public.clinic_prescriptions to authenticated;

create or replace function public.prevent_wallet_entry_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Wallet ledger entries are immutable.' using errcode = '42501';
end;
$$;

create trigger clinic_wallet_entries_immutable
  before update or delete on public.clinic_wallet_entries
  for each row execute function public.prevent_wallet_entry_mutation();

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit events are immutable.' using errcode = '42501';
end;
$$;

create trigger clinic_audit_events_immutable
  before update or delete on public.clinic_audit_events
  for each row execute function public.prevent_audit_mutation();

create or replace function public.prevent_signed_note_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  encounter_status text;
begin
  select status into encounter_status
  from public.clinic_encounters where id = coalesce(new.encounter_id, old.encounter_id);
  if encounter_status = 'signed' then
    raise exception 'Signed encounter notes cannot be changed; add an addendum.'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger clinic_encounter_notes_signed_guard
  before update or delete on public.clinic_encounter_notes
  for each row execute function public.prevent_signed_note_mutation();

create or replace function public.prevent_signed_encounter_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'signed' then
    raise exception 'Signed encounters cannot be changed.' using errcode = '42501';
  end if;
  if new.status = 'signed' then
    new.signed_at := coalesce(new.signed_at, now());
    new.signed_by := coalesce(new.signed_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger clinic_encounters_signed_guard
  before update on public.clinic_encounters
  for each row execute function public.prevent_signed_encounter_edit();

create or replace function public.create_clinic_encounter(
  p_appointment_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  appointment_row public.appointments%rowtype;
  encounter_id uuid;
begin
  if public.current_clinic_role() <> 'doctor' then
    raise exception 'Only a doctor can create an encounter.' using errcode = '42501';
  end if;
  if length(trim(p_note)) = 0 then
    raise exception 'Enter a clinical note.' using errcode = '22023';
  end if;
  select a.* into appointment_row
  from public.appointments a
  join public.clinic_providers p on p.id = a.provider_id
  where a.id = p_appointment_id and a.user_id = clinic_owner
    and p.auth_user_id = auth.uid() and p.user_id = clinic_owner;
  if not found then
    raise exception 'Appointment is not assigned to this doctor.' using errcode = '42501';
  end if;
  insert into public.clinic_encounters (
    appointment_id, patient_id, provider_id, created_by
  ) values (
    appointment_row.id, appointment_row.patient_id,
    appointment_row.provider_id, auth.uid()
  ) returning id into encounter_id;
  insert into public.clinic_encounter_notes (
    encounter_id, note_type, body, author_id
  ) values (encounter_id, 'draft', trim(p_note), auth.uid());
  insert into public.clinic_audit_events (
    user_id, actor_id, entity_type, entity_id, action
  ) values (
    clinic_owner, auth.uid(), 'encounter', encounter_id::text, 'created'
  );
  return encounter_id;
end;
$$;

create or replace function public.sign_clinic_encounter(
  p_encounter_id uuid,
  p_additional_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  encounter_row public.clinic_encounters%rowtype;
begin
  if public.current_clinic_role() <> 'doctor' then
    raise exception 'Only a doctor can sign an encounter.' using errcode = '42501';
  end if;
  select e.* into encounter_row
  from public.clinic_encounters e
  join public.clinic_providers p on p.id = e.provider_id
  where e.id = p_encounter_id and e.user_id = clinic_owner
    and p.auth_user_id = auth.uid() and p.user_id = clinic_owner
  for update of e;
  if not found or encounter_row.status <> 'draft' then
    raise exception 'Draft encounter not found or access denied.' using errcode = '42501';
  end if;
  if p_additional_note is not null and length(trim(p_additional_note)) > 0 then
    insert into public.clinic_encounter_notes (
      encounter_id, note_type, body, author_id
    ) values (encounter_row.id, 'draft', trim(p_additional_note), auth.uid());
  end if;
  update public.clinic_encounters
  set status = 'signed', signed_by = auth.uid(), signed_at = now()
  where id = encounter_row.id;
  insert into public.clinic_audit_events (
    user_id, actor_id, entity_type, entity_id, action
  ) values (
    clinic_owner, auth.uid(), 'encounter', encounter_row.id::text, 'signed'
  );
end;
$$;

create or replace function public.add_clinical_addendum(
  p_encounter_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner uuid := public.current_clinic_owner_id();
  encounter_row public.clinic_encounters%rowtype;
  note_id uuid;
begin
  if public.current_clinic_role() <> 'doctor' or length(trim(p_body)) = 0 then
    raise exception 'A doctor and a non-empty addendum are required.' using errcode = '42501';
  end if;
  select e.* into encounter_row
  from public.clinic_encounters e
  join public.clinic_providers p on p.id = e.provider_id
  where e.id = p_encounter_id and e.user_id = clinic_owner
    and p.auth_user_id = auth.uid() and e.status = 'signed';
  if not found then
    raise exception 'Signed encounter not found or access denied.' using errcode = '42501';
  end if;
  insert into public.clinic_encounter_notes (
    encounter_id, note_type, body, author_id
  ) values (encounter_row.id, 'addendum', trim(p_body), auth.uid())
  returning id into note_id;
  insert into public.clinic_audit_events (
    user_id, actor_id, entity_type, entity_id, action
  ) values (
    clinic_owner, auth.uid(), 'encounter', encounter_row.id::text, 'addendum'
  );
  return note_id;
end;
$$;

revoke all on function public.create_clinic_encounter(uuid, text) from public;
revoke all on function public.sign_clinic_encounter(uuid, text) from public;
revoke all on function public.add_clinical_addendum(uuid, text) from public;
grant execute on function public.create_clinic_encounter(uuid, text) to authenticated;
grant execute on function public.sign_clinic_encounter(uuid, text) to authenticated;
grant execute on function public.add_clinical_addendum(uuid, text) to authenticated;

revoke update on public.clinic_encounters from authenticated;
revoke update, delete on public.clinic_encounter_notes from authenticated;
revoke update, delete on public.clinic_audit_events from authenticated;
