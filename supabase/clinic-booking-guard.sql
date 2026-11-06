-- Stops double booking: one provider cannot have two booked appointments that
-- start at the same moment. The database refuses the second one, even if two
-- people click "Book" at the same time.
--
-- If existing data already has such a clash, the index is skipped with a notice
-- (fix the duplicates, then run this again). Safe to re-run.
do $$
begin
  if exists (
    select 1 from public.appointments
    where status = 'booked' and provider_id is not null
    group by provider_id, starts_at having count(*) > 1
  ) then
    raise notice 'Skipped: some provider already has two booked appointments at the same time. Fix those first.';
  else
    create unique index if not exists appointments_no_double_booking_idx
      on public.appointments (provider_id, starts_at)
      where status = 'booked' and provider_id is not null;
  end if;
end $$;
