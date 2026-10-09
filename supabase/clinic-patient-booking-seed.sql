-- Seeds a default provider, appointment types and weekly shifts so patients
-- can book online. Run once in the Supabase SQL editor. Safe to re-run.
do $$
declare
  owner_id uuid;
  provider uuid;
begin
  select id into owner_id
  from auth.users
  where raw_app_meta_data ->> 'clinic_role' = 'owner'
  order by created_at
  limit 1;

  if owner_id is null then
    raise exception 'No user with app_metadata clinic_role = owner was found.';
  end if;

  select id into provider
  from public.clinic_providers
  where user_id = owner_id and display_name = 'Dr. Family Clinic GP'
  limit 1;

  if provider is null then
    insert into public.clinic_providers
      (user_id, display_name, specialty, time_zone, max_daily_appointments)
    values
      (owner_id, 'Dr. Family Clinic GP', 'General practice', 'Africa/Johannesburg', 20)
    returning id into provider;
  end if;

  insert into public.clinic_appointment_types (user_id, name, category, duration_minutes)
  values
    (owner_id, 'General consultation', 'Consultation', 30),
    (owner_id, 'Follow-up visit', 'Consultation', 15),
    (owner_id, 'Vaccination', 'Preventive', 15),
    (owner_id, 'Child wellness check', 'Preventive', 30)
  on conflict (user_id, name) do nothing;

  if not exists (select 1 from public.clinic_provider_shifts where provider_id = provider) then
    insert into public.clinic_provider_shifts (user_id, provider_id, weekday, starts_at, ends_at)
    select owner_id, provider, d, time '08:00', time '17:00'
    from generate_series(1, 6) as d;
  end if;
end $$;
