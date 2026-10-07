create or replace function public.create_clinic_patient_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clinic_owner_ids uuid[];
  clinic_owner_count integer;
  clinic_owner uuid;
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

  clinic_owner := clinic_owner_ids[1];

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'clinic_role', 'patient',
      'clinic_owner_id', clinic_owner::text
    )
  where id = new.id;

  insert into public.patients (
    user_id,
    full_name,
    email,
    auth_user_id
  )
  values (
    clinic_owner,
    patient_name,
    new.email,
    new.id
  );

  return new;
end;
$$;

revoke all on function public.create_clinic_patient_on_signup() from public;

drop trigger if exists on_auth_user_created_clinic_patient on auth.users;
create trigger on_auth_user_created_clinic_patient
  after insert on auth.users
  for each row execute function public.create_clinic_patient_on_signup();

drop policy if exists "patients: pharmacy read prescribed patients"
  on public.patients;
create policy "patients: pharmacy read prescribed patients"
  on public.patients for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) = 'pharmacist'
    and exists (
      select 1 from public.clinic_prescriptions cp
      where cp.patient_id = patients.id
        and cp.user_id = patients.user_id
    )
  );
