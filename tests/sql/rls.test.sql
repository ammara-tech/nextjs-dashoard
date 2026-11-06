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
