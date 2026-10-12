-- Demo data for the Family Clinic dashboards: Monday to Friday shifts for the
-- existing "Dr. Sample ..." providers (no other doctors are created), six sample patients (patient numbers DEMO-0001 to DEMO-0006)
-- and a week of appointments around today for each doctor.
--
-- Run once in the Supabase SQL editor. Safe to re-run: existing
-- patients and shifts are reused, and a doctor who already has appointments
-- is left alone. Remove the demo patients later by archiving them in the app.
do $$
declare
  owner_id uuid;
  doc record;
  pat record;
  prov uuid;
  pid uuid;
  provider_ids uuid[] := '{}';
  patient_ids uuid[] := '{}';
  idx int;
begin
  select id into owner_id
  from auth.users
  where raw_app_meta_data ->> 'clinic_role' = 'owner'
  order by created_at
  limit 1;

  if owner_id is null then
    raise exception 'No user with app_metadata clinic_role = owner was found.';
  end if;

  if not exists (
    select 1 from public.clinic_providers
    where user_id = owner_id and display_name like 'Dr. Sample%' and active
  ) then
    raise exception 'No active "Dr. Sample ..." providers found. Add them first in the Providers page.';
  end if;

  insert into public.clinic_appointment_types (user_id, name, category, duration_minutes)
  values
    (owner_id, 'General consultation', 'Consultation', 30),
    (owner_id, 'Follow-up visit', 'Consultation', 15),
    (owner_id, 'Vaccination', 'Preventive', 15),
    (owner_id, 'Child wellness check', 'Preventive', 30)
  on conflict (user_id, name) do nothing;

  -- Uses only the existing "Dr. Sample ..." providers; no other doctors are
  -- created. Each gets Monday to Friday shifts if it has none yet.
  for doc in
    select
      p.id,
      row_number() over (order by p.display_name)::int as n
    from public.clinic_providers p
    where p.user_id = owner_id
      and p.display_name like 'Dr. Sample%'
      and p.active
  loop
    prov := doc.id;
    provider_ids := provider_ids || prov;

    if not exists (select 1 from public.clinic_provider_shifts where provider_id = prov) then
      insert into public.clinic_provider_shifts (user_id, provider_id, weekday, starts_at, ends_at)
      select
        owner_id,
        prov,
        d,
        case
          when doc.n = 2 then time '09:00'
          when doc.n = 3 and d in (2, 4) then time '12:00'
          else time '08:00'
        end,
        case
          when doc.n = 1 then time '17:00'
          when doc.n = 2 then time '16:00'
          when d in (2, 4) then time '18:00'
          else time '14:00'
        end
      from generate_series(1, 5) as d;
    end if;
  end loop;

  -- Sample patients.
  for pat in
    select * from (values
      (1, 'Lerato Dlamini', '082 555 0101', date '1988-03-14'),
      (2, 'Pieter van der Merwe', '083 555 0102', date '1975-11-02'),
      (3, 'Naledi Khumalo', '071 555 0103', date '2016-07-21'),
      (4, 'Imran Joosub', '084 555 0104', date '1992-01-30'),
      (5, 'Thandi Mahlangu', '072 555 0105', date '1964-09-09'),
      (6, 'Zinhle Sithole', '076 555 0106', date '2019-05-17')
    ) as t(n, name, phone, dob)
  loop
    select id into pid
    from public.patients
    where user_id = owner_id and patient_number = 'DEMO-000' || pat.n
    limit 1;

    if pid is null then
      insert into public.patients (user_id, full_name, phone, date_of_birth, patient_number)
      values (owner_id, pat.name, pat.phone, pat.dob, 'DEMO-000' || pat.n)
      returning id into pid;
    end if;
    patient_ids := patient_ids || pid;
  end loop;

  -- Appointments around today for each doctor (past days are done / no-show).
  for idx in 1 .. array_length(provider_ids, 1) loop
    if not exists (
      select 1 from public.appointments where provider_id = provider_ids[idx]
    ) then
      insert into public.appointments
        (user_id, patient_id, provider_id, appointment_type_id, duration_minutes, starts_at, status)
      select
        owner_id,
        patient_ids[((s.pat + idx) % 6) + 1],
        provider_ids[idx],
        t.id,
        t.duration_minutes,
        ((current_date + s.day_offset) + s.at)::timestamp at time zone 'Africa/Johannesburg',
        s.status::public.appointment_status
      from (values
        (0, time '08:30', 0, 'General consultation', 'booked'),
        (0, time '09:15', 1, 'Follow-up visit', 'booked'),
        (0, time '10:00', 2, 'Child wellness check', 'booked'),
        (0, time '11:30', 3, 'Vaccination', 'booked'),
        (0, time '14:00', 4, 'General consultation', 'booked'),
        (1, time '09:00', 5, 'Child wellness check', 'booked'),
        (1, time '10:30', 0, 'Follow-up visit', 'booked'),
        (2, time '08:45', 1, 'General consultation', 'booked'),
        (2, time '13:00', 2, 'Vaccination', 'booked'),
        (3, time '09:30', 3, 'General consultation', 'booked'),
        (4, time '11:00', 4, 'Follow-up visit', 'booked'),
        (-1, time '09:00', 5, 'General consultation', 'done'),
        (-1, time '10:00', 0, 'Vaccination', 'done'),
        (-2, time '15:00', 1, 'Follow-up visit', 'no_show'),
        (-3, time '09:00', 2, 'General consultation', 'done')
      ) as s(day_offset, at, pat, type_name, status)
      join public.clinic_appointment_types t
        on t.user_id = owner_id and t.name = s.type_name;
    end if;
  end loop;
end $$;
