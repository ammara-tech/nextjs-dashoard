-- Lets the clinic owner and administrators change when a provider is available.
--
-- set_provider_availability replaces the weekly shifts for the days it is given
-- in one step: either all the changes are saved or none are. Days that are not
-- sent are left alone. Only the owner and administrators can use it, and only
-- for providers that belong to their clinic.
--
-- Run once in the Supabase SQL editor after clinic-scheduling.sql. Safe to re-run.
create or replace function public.set_provider_availability(
  p_provider_id uuid,
  p_days jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.current_clinic_owner_id();
  v_role text := public.current_clinic_role();
  v_day jsonb;
  v_weekday int;
  v_start time;
  v_end time;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only the clinic owner or an administrator can change availability.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.clinic_providers p
    where p.id = p_provider_id and p.user_id = v_owner
  ) then
    raise exception 'That provider was not found.' using errcode = 'P0001';
  end if;

  if p_days is null or jsonb_typeof(p_days) <> 'array' then
    raise exception 'Send the days as a list.' using errcode = 'P0001';
  end if;

  for v_day in select * from jsonb_array_elements(p_days) loop
    v_weekday := (v_day ->> 'weekday')::int;
    if v_weekday is null or v_weekday not between 0 and 6 then
      raise exception 'Weekday must be between 0 and 6.' using errcode = 'P0001';
    end if;

    delete from public.clinic_provider_shifts
    where provider_id = p_provider_id and weekday = v_weekday;

    if coalesce((v_day ->> 'working')::boolean, false) then
      v_start := (v_day ->> 'starts_at')::time;
      v_end := (v_day ->> 'ends_at')::time;
      if v_start is null or v_end is null or v_start >= v_end then
        raise exception 'The shift end time must be later than its start time.'
          using errcode = 'P0001';
      end if;
      insert into public.clinic_provider_shifts
        (user_id, provider_id, weekday, starts_at, ends_at)
      values (v_owner, p_provider_id, v_weekday, v_start, v_end);
    end if;
  end loop;
end;
$$;

revoke all on function public.set_provider_availability(uuid, jsonb) from public, anon;
grant execute on function public.set_provider_availability(uuid, jsonb) to authenticated;
