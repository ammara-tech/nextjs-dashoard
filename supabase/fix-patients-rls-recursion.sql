-- Fixes: infinite recursion detected in policy for relation "patients"
-- (patients -> clinic_prescriptions -> patients). Safe to re-run.
create or replace function public.pharmacist_can_access_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_clinic_role() = 'pharmacist'
    and exists (
      select 1 from public.clinic_prescriptions cp
      where cp.patient_id = p_patient_id
        and cp.user_id = public.current_clinic_owner_id()
    )
$$;
revoke all on function public.pharmacist_can_access_patient(uuid) from public;
grant execute on function public.pharmacist_can_access_patient(uuid) to authenticated;

drop policy if exists "patients: pharmacy read prescribed patients"
  on public.patients;
create policy "patients: pharmacy read prescribed patients"
  on public.patients for select to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.pharmacist_can_access_patient(id))
  );
