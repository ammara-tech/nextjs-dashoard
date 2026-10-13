-- Turns on live updates (Supabase Realtime) for the tables the dashboards watch:
-- appointments, care plan payments and memberships, and claims. Row-level
-- security still decides who receives each change.
--
-- Run once in the Supabase SQL editor, after clinic-claims.sql. Safe to re-run.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'The supabase_realtime publication does not exist; enable Realtime in the Supabase dashboard.';
    return;
  end if;
  foreach t in array array[
    'appointments',
    'clinic_care_plan_payments',
    'clinic_care_plan_memberships',
    'clinic_claims'
  ] loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
