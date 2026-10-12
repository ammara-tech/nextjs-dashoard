alter table public.clinic_inventory_batches
  add column if not exists available boolean not null default true,
  add column if not exists unavailable_reason text
    check (unavailable_reason is null or char_length(unavailable_reason) <= 200);

grant update (available, unavailable_reason)
  on public.clinic_inventory_batches to authenticated;
