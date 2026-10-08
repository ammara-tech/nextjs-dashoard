do $$
declare
  request_row record;
  matching_patient_id uuid;
  matching_auth_user_id uuid;
begin
  if to_regclass('public.clinic_patient_access_requests') is not null then
    for request_row in
      execute
        'select user_id, auth_user_id, full_name, email
         from public.clinic_patient_access_requests
         where status = $1'
      using 'pending'
    loop
      update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'clinic_role', 'patient',
          'clinic_owner_id', request_row.user_id::text
        )
      where id = request_row.auth_user_id;

      if not exists (
        select 1
        from public.patients
        where auth_user_id = request_row.auth_user_id
      ) then
        matching_patient_id := null;
        matching_auth_user_id := null;

        select id, auth_user_id
        into matching_patient_id, matching_auth_user_id
        from public.patients
        where user_id = request_row.user_id
          and lower(email) = lower(request_row.email)
        order by created_at
        limit 1
        for update;

        if matching_patient_id is not null
          and matching_auth_user_id is null then
          update public.patients
          set auth_user_id = request_row.auth_user_id
          where id = matching_patient_id;
        else
          insert into public.patients (
            user_id,
            full_name,
            email,
            auth_user_id
          )
          values (
            request_row.user_id,
            request_row.full_name,
            request_row.email,
            request_row.auth_user_id
          );
        end if;
      end if;
    end loop;
  end if;
end;
$$;

drop function if exists public.approve_clinic_patient_access(uuid);
drop function if exists public.deny_clinic_patient_access(uuid);
drop table if exists public.clinic_patient_access_requests;
