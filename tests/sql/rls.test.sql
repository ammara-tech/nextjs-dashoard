-- Row-level security tests. Each block signs in as someone by setting the JWT
-- claims Supabase would set, switches to the "authenticated" role, and asserts
-- what the database returns. Any failed assertion stops the run.

-- Fixtures -----------------------------------------------------------------
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'staff@test.example',
   '{"clinic_role":"front_desk","clinic_owner_id":"b131b12e-4a10-4d7b-904a-087c610a8a53"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'doctor@test.example',
   '{"clinic_role":"doctor","clinic_owner_id":"b131b12e-4a10-4d7b-904a-087c610a8a53"}');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'alice@test.example',
   '{"family_clinic_patient_signup":"true","full_name":"Alice Test","phone":"0821111111"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'bob@test.example',
   '{"family_clinic_patient_signup":"true","full_name":"Bob Test","phone":"0822222222"}');

create or replace function pg_temp.sign_in(uid uuid) returns void language plpgsql as $$
declare u auth.users%rowtype;
begin
  select * into u from auth.users where id = uid;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', u.raw_app_meta_data)::text, true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.sign_in(uuid) to public;

-- 1. Signing up as a patient links a patient row and grants the patient role.
do $$ begin
  assert (select raw_app_meta_data ->> 'clinic_role' from auth.users where id = '00000000-0000-0000-0000-0000000000b1') = 'patient',
    'signup should grant the patient role';
  assert (select count(*) from public.patients where auth_user_id = '00000000-0000-0000-0000-0000000000b1') = 1,
    'signup should create a linked patient row';
end $$;

-- 2. A patient sees only their own patient row.
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000b1') \g /dev/null
do $$ begin
  assert (select count(*) from public.patients) = 1, 'Alice must see exactly one patient row';
  assert (select full_name from public.patients) = 'Alice Test', 'Alice must see her own row';
end $$;
rollback;

-- 3. Signed out (anon) sees nothing.
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.patients) = 0, 'anon must not see patients';
exception when insufficient_privilege then null;
end $$;
rollback;

-- 4. Staff see the whole clinic; the owner too.
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000a1') \g /dev/null
do $$ begin
  assert (select count(*) from public.patients) >= 32, 'front desk should see all clinic patients';
end $$;
rollback;
begin;
select pg_temp.sign_in('b131b12e-4a10-4d7b-904a-087c610a8a53') \g /dev/null
do $$ begin
  assert (select count(*) from public.patients) >= 32, 'owner should see all clinic patients';
end $$;
rollback;

-- 5. A patient cannot write to another patient's data.
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000b1') \g /dev/null
do $$
declare bob uuid; n int;
begin
  -- Bob's id cannot even be read by Alice, so there is nothing to attack.
  select id into bob from public.patients where full_name = 'Bob Test';
  assert bob is null, 'Alice must not be able to read Bob''s patient row';
  update public.patients set phone = '000' where full_name = 'Bob Test';
  get diagnostics n = row_count;
  assert n = 0, 'Alice must not be able to update Bob';
end $$;
rollback;

-- 6. Patient profile editing: allowed for yourself, validated, patients only.
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000b1') \g /dev/null
select public.update_my_profile('Alice Renamed', '0829999999', 'alice@test.example', null);
do $$ begin
  assert (select full_name from public.patients) = 'Alice Renamed', 'profile edit should apply';
  begin
    perform public.update_my_profile('A', '0829999999', null, null);
    assert false, 'a one-letter name must be rejected';
  exception when sqlstate 'P0001' then null;
  end;
  begin
    perform public.update_my_profile('Alice', 'call me!', null, null);
    assert false, 'a bad phone number must be rejected';
  exception when sqlstate 'P0001' then null;
  end;
end $$;
rollback;
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000a1') \g /dev/null
do $$ begin
  begin
    perform public.update_my_profile('Staff Person', null, null, null);
    assert false, 'staff must not use the patient profile function';
  exception when sqlstate 'P0001' then null;
  end;
end $$;
rollback;

-- 7. Claims: a patient submits, only they and staff see it, and only legal moves work.
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000b1') \g /dev/null
select public.submit_claim('Dentist visit', 45000) as claim_id \gset
do $$ begin
  assert (select count(*) from public.clinic_claims) = 1, 'Alice sees her own claim';
  begin
    perform public.set_claim_status((select id from public.clinic_claims), 'approved');
    assert false, 'a patient must not change claim status';
  exception when sqlstate 'P0001' then null;
  end;
end $$;
commit;

begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000b2') \g /dev/null
do $$ begin
  assert (select count(*) from public.clinic_claims) = 0, 'Bob must not see Alice''s claim';
end $$;
rollback;

begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000a1') \g /dev/null
do $$
declare cid uuid;
begin
  select id into cid from public.clinic_claims where description = 'Dentist visit';
  assert cid is not null, 'staff should see the claim';
  begin
    perform public.set_claim_status(cid, 'paid');
    assert false, 'submitted -> paid must be refused';
  exception when sqlstate 'P0001' then null;
  end;
  perform public.set_claim_status(cid, 'in_review');
  perform public.set_claim_status(cid, 'approved');
  perform public.set_claim_status(cid, 'paid');
  assert (select status from public.clinic_claims where id = cid) = 'paid', 'legal path should end paid';
  execute 'reset role'; -- front desk cannot read the log; check as the database owner
  assert (select count(*) from public.clinic_audit_events where entity_type = 'clinic_claims' and action = 'status_change' and entity_id = cid::text) = 3,
    'each claim status change should be audited';
  assert (select details ->> 'status_to' from public.clinic_audit_events
          where entity_type = 'clinic_claims' and action = 'status_change' and entity_id = cid::text order by id desc limit 1) = 'paid',
    'latest audited change should be paid';
  begin
    perform public.set_claim_status(cid, 'rejected');
    assert false, 'paid is final';
  exception when sqlstate 'P0001' then null;
  end;
end $$;
rollback;

-- 8. Care plans are readable by signed-in users; memberships are private.
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000b2') \g /dev/null
do $$ begin
  assert (select count(*) from public.clinic_care_plans) >= 3, 'plans are public to signed-in users';
  assert (select count(*) from public.clinic_care_plan_memberships) = 0, 'Bob has no memberships to see';
end $$;
rollback;

-- 9. Audit log: changes are recorded, only owner/admin can read, nobody can edit.
do $$ begin
  assert (select count(*) from public.clinic_audit_events where entity_type = 'clinic_claims' and action = 'insert') >= 1,
    'claim creation should be audited';
  assert (select count(*) from public.clinic_audit_events where entity_type = 'patients' and action = 'insert') >= 2,
    'patient creation should be audited';
  assert not exists (select 1 from public.clinic_audit_events where details::text ilike '%Dentist%' or details::text ilike '%0829999999%'),
    'audit rows must not hold personal values';
end $$;
begin;
select pg_temp.sign_in('b131b12e-4a10-4d7b-904a-087c610a8a53') \g /dev/null
do $$ begin
  assert (select count(*) from public.clinic_audit_events) > 0, 'owner reads the audit log';
end $$;
rollback;
begin;
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000a1') \g /dev/null
do $$ begin
  assert (select count(*) from public.clinic_audit_events) = 0, 'front desk must not read the audit log';
end $$;
rollback;
begin;
select pg_temp.sign_in('b131b12e-4a10-4d7b-904a-087c610a8a53') \g /dev/null
do $$ begin
  begin
    update public.clinic_audit_events set action = 'x';
    assert false, 'audit rows must be immutable';
  exception when others then
    if sqlerrm like 'audit rows must be immutable' then raise; end if;
  end;
end $$;
rollback;

-- 10. Double booking is refused.
do $$
declare prov uuid; pat uuid; at_time timestamptz := now() + interval '3 days';
begin
  select id into prov from public.clinic_providers limit 1;
  if prov is null then
    insert into public.clinic_providers (user_id, display_name, specialty) values ('b131b12e-4a10-4d7b-904a-087c610a8a53', 'Dr. Test', 'GP') returning id into prov;
  end if;
  select id into pat from public.patients limit 1;
  insert into public.appointments (user_id, patient_id, provider_id, starts_at, status)
  values ('b131b12e-4a10-4d7b-904a-087c610a8a53', pat, prov, at_time, 'booked');
  begin
    insert into public.appointments (user_id, patient_id, provider_id, starts_at, status)
    values ('b131b12e-4a10-4d7b-904a-087c610a8a53', pat, prov, at_time, 'booked');
    assert false, 'second booking at the same time must be refused';
  exception when unique_violation then null;
  end;
end $$;

-- 11. Reminders: only the service role can use them; sent reminders are not repeated.
begin;
select pg_temp.sign_in('b131b12e-4a10-4d7b-904a-087c610a8a53') \g /dev/null
do $$ begin
  begin
    perform * from public.appointments_due_for_reminder(now(), now() + interval '10 days');
    assert false, 'owner must not call the reminder function';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
begin;
set local role service_role;
do $$
declare a uuid; n1 int; n2 int;
begin
  select count(*) into n1 from public.appointments_due_for_reminder(now(), now() + interval '10 days') where not email_done;
  assert n1 >= 1, 'a future booked appointment should be due';
  select appointment_id into a from public.appointments_due_for_reminder(now(), now() + interval '10 days') where not email_done limit 1;
  perform public.record_reminder(a, 'email', 'sent');
  select count(*) into n2 from public.appointments_due_for_reminder(now(), now() + interval '10 days') where not email_done;
  assert n2 = n1 - 1, 'a reminded appointment is not due again';
end $$;
rollback;

-- 12. Plan renewals: due plans renew once; a missing card marks payment due.
do $$
declare card uuid; pid uuid; mid uuid; mid2 uuid; before_n int; r record;
begin
  select id into pid from public.patients where auth_user_id = '00000000-0000-0000-0000-0000000000b1';
  insert into public.clinic_saved_cards (patient_id, auth_user_id, cardholder_name, brand, last4, exp_month, exp_year)
  values (pid, '00000000-0000-0000-0000-0000000000b1', 'Alice', 'visa', '4242', 12, 2099) returning id into card;
  insert into public.clinic_care_plan_memberships (user_id, patient_id, plan_code, card_id, status, next_debit_on)
  values ('b131b12e-4a10-4d7b-904a-087c610a8a53', pid, 'essential', card, 'active', current_date - 1) returning id into mid;
  select count(*) into before_n from public.clinic_care_plan_payments where membership_id = mid;
  set local role service_role;
  select * into r from public.run_plan_renewals();
  reset role;
  assert r.renewed >= 1, 'a due plan should renew';
  assert (select count(*) from public.clinic_care_plan_payments where membership_id = mid) = before_n + 1, 'one payment recorded';
  assert (select next_debit_on from public.clinic_care_plan_memberships where id = mid) > current_date, 'date moves on';
  set local role service_role;
  select * into r from public.run_plan_renewals();
  reset role;
  assert r.renewed = 0, 'renewing again does nothing';

  -- cancel the first plan and make a new one whose card has gone
  update public.clinic_care_plan_memberships set status = 'cancelled' where id = mid;
  insert into public.clinic_care_plan_memberships (user_id, patient_id, plan_code, card_id, status, next_debit_on)
  values ('b131b12e-4a10-4d7b-904a-087c610a8a53', pid, 'essential', null, 'active', current_date) returning id into mid2;
  set local role service_role;
  select * into r from public.run_plan_renewals();
  reset role;
  assert r.failed >= 1, 'a plan without a card fails';
  assert (select payment_failed_at from public.clinic_care_plan_memberships where id = mid2) is not null, 'marked payment due';
end $$;

-- 13. Gateway events: recorded once, service role only.
begin;
select pg_temp.sign_in('b131b12e-4a10-4d7b-904a-087c610a8a53') \g /dev/null
do $$ begin
  begin
    perform public.record_gateway_event('1', 'REF', 'COMPLETE', 100);
    assert false, 'owner must not record gateway events';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
begin;
set local role service_role;
do $$ begin
  assert public.record_gateway_event('42', 'REF-1', 'COMPLETE', 19900) = true, 'first event is new';
  assert public.record_gateway_event('42', 'REF-1', 'COMPLETE', 19900) = false, 'repeat event is ignored';
  assert (select count(*) from public.clinic_gateway_events where gateway_payment_id = '42') = 1, 'stored once';
end $$;
rollback;
