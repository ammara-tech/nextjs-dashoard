-- Payment gateway events (PayFast sandbox).
--
-- Every notification the gateway sends to /api/payments/payfast/notify is checked
-- (signature, merchant, amount) and then written here once. The unique gateway
-- payment id makes the webhook safe to receive twice. Only the server's service
-- role can read or write this table. Safe to re-run.

create table if not exists public.clinic_gateway_events (
  id bigint generated always as identity primary key,
  gateway text not null default 'payfast',
  gateway_payment_id text not null,
  reference text not null,
  payment_status text not null,
  amount_minor integer not null check (amount_minor >= 0),
  received_at timestamptz not null default now(),
  unique (gateway, gateway_payment_id)
);
alter table public.clinic_gateway_events enable row level security;
revoke all on public.clinic_gateway_events from anon, authenticated;

-- Returns true the first time an event is seen and false for a repeat.
create or replace function public.record_gateway_event(
  p_gateway_payment_id text,
  p_reference text,
  p_payment_status text,
  p_amount_minor integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.clinic_gateway_events
    (gateway_payment_id, reference, payment_status, amount_minor)
  values (p_gateway_payment_id, p_reference, p_payment_status, p_amount_minor);
  return true;
exception when unique_violation then
  return false;
end;
$$;

revoke all on function public.record_gateway_event(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.record_gateway_event(text, text, text, integer) to service_role;
