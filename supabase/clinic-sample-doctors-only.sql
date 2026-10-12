-- Keep only the "Dr. Sample ..." providers.
--
-- Every other provider (for example "Dr. Amara Naidoo" and
-- "Dr. Family Clinic GP") is removed. If a provider already has appointments,
-- notes or other history, the database will not let it be deleted, so it is
-- switched to inactive instead. Inactive providers no longer appear in the
-- doctor pop-up, online booking or the provider lists, and their history is
-- kept.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
do $$
declare
  p record;
  removed int := 0;
  hidden int := 0;
begin
  for p in
    select id, display_name
    from public.clinic_providers
    where display_name not like 'Dr. Sample%'
  loop
    begin
      -- Delete in a sub-transaction so a failure rolls back just this provider.
      delete from public.clinic_provider_blocks where provider_id = p.id;
      delete from public.clinic_provider_shifts where provider_id = p.id;
      delete from public.clinic_providers where id = p.id;
      removed := removed + 1;
    exception when foreign_key_violation or restrict_violation then
      update public.clinic_providers set active = false where id = p.id;
      hidden := hidden + 1;
    end;
  end loop;

  raise notice 'Providers deleted: %, hidden (have history): %', removed, hidden;
end $$;

-- Check the result: only Dr. Sample providers should be active.
select display_name, specialty, active
from public.clinic_providers
order by active desc, display_name;
