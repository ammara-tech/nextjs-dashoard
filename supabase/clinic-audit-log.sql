-- Audit log: records who changed what, and when, for the owner's audit page.
--
-- Triggers write one row to clinic_audit_events whenever a patient, appointment,
-- claim, Care Plan membership or Care Plan payment is created, changed or removed.
-- The log stores WHICH fields changed (and a status change), never the values of
-- personal details. Rows cannot be edited or deleted (see prevent_audit_mutation).
--
-- Run once in the Supabase SQL editor after clinic-platform.sql, clinic-care-plans.sql
-- and clinic-claims.sql. Safe to re-run.

create or replace function public.log_clinic_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_changed text[];
  v_details jsonb := '{}'::jsonb;
  v_owner uuid;
  v_action text;
begin
  v_action := lower(tg_op);
  v_row := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_owner := nullif(v_row ->> 'user_id', '')::uuid;
  if v_owner is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    select coalesce(array_agg(n.key order by n.key), '{}')
    into v_changed
    from jsonb_each(v_row) n
    where n.value is distinct from v_old -> n.key;
    if cardinality(v_changed) = 0 then
      return new;
    end if;
    v_details := jsonb_build_object('fields', to_jsonb(v_changed));
    if v_row ? 'status' and v_row -> 'status' is distinct from v_old -> 'status' then
      v_details := v_details || jsonb_build_object(
        'status_from', v_old ->> 'status', 'status_to', v_row ->> 'status');
      v_action := 'status_change';
    end if;
  elsif v_row ? 'status' then
    v_details := jsonb_build_object('status', v_row ->> 'status');
  end if;

  insert into public.clinic_audit_events (user_id, actor_id, entity_type, entity_id, action, details)
  values (v_owner, coalesce(auth.uid(), v_owner), tg_table_name, v_row ->> 'id', v_action, v_details);

  return coalesce(new, old);
end;
$$;

revoke all on function public.log_clinic_audit() from public;

do $$
declare t text;
begin
  foreach t in array array[
    'patients', 'appointments', 'clinic_claims',
    'clinic_care_plan_memberships', 'clinic_care_plan_payments'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format(
        'create trigger audit_%1$s after insert or update or delete on public.%1$I
         for each row execute function public.log_clinic_audit()', t);
    end if;
  end loop;
end $$;

create index if not exists clinic_audit_events_clinic_time_idx
  on public.clinic_audit_events (user_id, occurred_at desc);
