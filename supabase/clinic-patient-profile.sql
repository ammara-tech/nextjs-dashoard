-- Lets a patient edit their own contact details from the patient portal.
--
-- Patients cannot update the patients table directly. update_my_profile changes
-- only the signed-in patient's own row, and only name, phone, email and date of
-- birth. Run once in the Supabase SQL editor. Safe to re-run.
create or replace function public.update_my_profile(
  p_full_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or public.current_clinic_role() is distinct from 'patient' then
    raise exception 'Only patients can edit their own profile.' using errcode = 'P0001';
  end if;

  if p_full_name is null or char_length(trim(p_full_name)) not between 2 and 80 then
    raise exception 'Enter your full name (2 to 80 characters).' using errcode = 'P0001';
  end if;
  if p_phone is not null and trim(p_phone) <> ''
     and trim(p_phone) !~ '^[0-9+()\- ]{5,30}$' then
    raise exception 'Enter a valid phone number.' using errcode = 'P0001';
  end if;
  if p_email is not null and trim(p_email) <> ''
     and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.' using errcode = 'P0001';
  end if;
  if p_date_of_birth is not null
     and (p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01') then
    raise exception 'Enter a valid date of birth.' using errcode = 'P0001';
  end if;

  update public.patients
  set full_name = trim(p_full_name),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      email = nullif(trim(coalesce(p_email, '')), ''),
      date_of_birth = p_date_of_birth
  where auth_user_id = v_uid;

  if not found then
    raise exception 'Your patient account is not linked.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.update_my_profile(text, text, text, date) from public;
grant execute on function public.update_my_profile(text, text, text, date) to authenticated;
