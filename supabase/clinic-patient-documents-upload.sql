-- Lets signed-in patients upload their own documents.
-- Run in the Supabase SQL editor after clinic-platform.sql.

drop policy if exists "clinic documents: patient upload" on public.clinic_patient_documents;
create policy "clinic documents: patient upload"
  on public.clinic_patient_documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (select public.current_clinic_role()) = 'patient'
    and exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.auth_user_id = (select auth.uid())
    )
    and split_part(object_path, '/', 1) = 'pt_' || patient_id::text
    and split_part(object_path, '/', 2) = category
    and split_part(object_path, '/', 3) <> ''
    and split_part(object_path, '/', 4) = ''
  );

-- Path: pt_<patient uuid>/<category>/<file>
drop policy if exists "patient documents: patient upload" on storage.objects;
create policy "patient documents: patient upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patients-medical-records'
    and (select public.current_clinic_role()) = 'patient'
    and split_part(name, '/', 2) in ('identity', 'clinical_history', 'invoices')
    and split_part(name, '/', 3) <> ''
    and split_part(name, '/', 4) = ''
    and exists (
      select 1 from public.patients p
      where p.auth_user_id = (select auth.uid())
        and split_part(name, '/', 1) = 'pt_' || p.id::text
    )
  );
