-- Any new Auth user (email sign-up, OAuth, Supabase dashboard invite) that has
-- no clinic role yet is recognised as a patient and shows up on the admin
-- Patients page. Accounts that already carry a clinic_role (owner, staff) are
-- left alone. Non-form signups never block account creation.
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
  is_form_signup boolean;
  patient_name text;
  patient_phone text;
  patient_dob date;
begin
  is_form_signup := coalesce(
    new.raw_user_meta_data ->> 'family_clinic_patient_signup', ''
  ) = 'true';

  if not is_form_signup
     and coalesce(new.raw_app_meta_data ->> 'clinic_role', '') <> '' then
    return new;
  end if;

  patient_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ));

  if length(patient_name) < 2 or length(patient_name) > 160 then
    if is_form_signup then
      raise exception 'Patient registration requires a valid full name.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  patient_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  begin
    patient_dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  exception when others then
    patient_dob := null;
  end;

  select count(*)::integer, array_agg(u.id order by u.created_at)
  into clinic_owner_count, clinic_owner_ids
  from auth.users u
  where u.raw_app_meta_data ->> 'clinic_role' = 'owner';

  if clinic_owner_count <> 1 then
    if is_form_signup then
      raise exception
        'Patient registration requires exactly one Auth user with clinic_role owner; found %.',
        clinic_owner_count
        using errcode = '55000';
    end if;
    return new;
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
    user_id, full_name, phone, date_of_birth, email, auth_user_id
  )
  values (
    clinic_owner, patient_name, patient_phone, patient_dob, new.email, new.id
  );

  return new;
end;
$$;

revoke all on function public.create_clinic_patient_on_signup() from public;

drop trigger if exists on_auth_user_created_clinic_patient on auth.users;
create trigger on_auth_user_created_clinic_patient
  after insert on auth.users
  for each row execute function public.create_clinic_patient_on_signup();
