-- Care Plan renewals and "payment due" tracking.
--
-- run_plan_renewals() is called daily by the scheduled route /api/cron/renewals.
-- For every active membership whose next debit date has arrived it records the
-- next DEMO payment (no money moves) and moves the date on one month. If the saved
-- card was removed or has expired, nothing is recorded and the membership is marked
-- payment_failed_at, which the patient and staff see as "Payment due".
-- Only the server's service role can run it. Safe to re-run.

alter table public.clinic_care_plan_memberships
  add column if not exists payment_failed_at timestamptz;

create or replace function public.run_plan_renewals()
returns table (renewed integer, failed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.clinic_care_plan_memberships%rowtype;
  v_card public.clinic_saved_cards%rowtype;
  v_plan public.clinic_care_plans%rowtype;
  v_next date;
  v_renewed integer := 0;
  v_failed integer := 0;
begin
  for m in
    select * from public.clinic_care_plan_memberships
    where status = 'active' and next_debit_on is not null and next_debit_on <= current_date
    for update skip locked
  loop
    select * into v_card from public.clinic_saved_cards where id = m.card_id;
    select * into v_plan from public.clinic_care_plans where code = m.plan_code;

    if not found
       or v_card.id is null
       or (v_card.exp_year, v_card.exp_month) <
          (extract(year from current_date)::int, extract(month from current_date)::int) then
      update public.clinic_care_plan_memberships
      set payment_failed_at = coalesce(payment_failed_at, now())
      where id = m.id;
      v_failed := v_failed + 1;
      continue;
    end if;

    v_next := (m.next_debit_on + interval '1 month')::date;
    insert into public.clinic_care_plan_payments
      (user_id, membership_id, patient_id, plan_code, amount_minor, currency,
       card_brand, card_last4, status, is_demo, reference, period_start, period_end)
    values
      (m.user_id, m.id, m.patient_id, m.plan_code, v_plan.price_minor, v_plan.currency,
       v_card.brand, v_card.last4, 'paid', true,
       'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
       m.next_debit_on, v_next - 1);

    update public.clinic_care_plan_memberships
    set next_debit_on = v_next, payment_failed_at = null
    where id = m.id;
    v_renewed := v_renewed + 1;
  end loop;

  return query select v_renewed, v_failed;
end;
$$;

revoke all on function public.run_plan_renewals() from public, anon, authenticated;
grant execute on function public.run_plan_renewals() to service_role;
