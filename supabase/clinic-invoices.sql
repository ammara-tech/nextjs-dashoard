-- Lets patients, admins and front desk read the services (treatments) on
-- their own appointments, so appointment invoices can be generated for them.
-- Owners could already read treatments. Patients see only treatments on
-- appointments linked to their own account, and nobody gains write access.
--
-- Run once in the Supabase SQL editor after medi-clinic.sql and clinic-platform.sql.
-- Safe to re-run.

drop policy if exists "treatments: patient read own" on public.treatments;
create policy "treatments: patient read own"
  on public.treatments for select
  to authenticated
  using (
    (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1
      from public.appointments a
      join public.patients p on p.id = a.patient_id
      where a.id = treatments.appointment_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "treatments: staff read" on public.treatments;
create policy "treatments: staff read"
  on public.treatments for select
  to authenticated
  using (
    user_id = (select public.current_clinic_owner_id())
    and (select public.current_clinic_role()) in ('admin', 'front_desk')
  );
