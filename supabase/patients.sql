create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  full_name text not null,
  phone text,
  date_of_birth date,
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

revoke all on table public.patients from anon, authenticated;
grant select, insert, update, delete on table public.patients to authenticated;

create policy "patients: owner can select"
  on public.patients for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "patients: owner can insert"
  on public.patients for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "patients: owner can update"
  on public.patients for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "patients: owner can delete"
  on public.patients for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index patients_user_id_idx on public.patients (user_id);

insert into public.patients (user_id, full_name, phone, date_of_birth, created_at)
select
  'b131b12e-4a10-4d7b-904a-087c610a8a53'::uuid,
  'Patient ' || g,
  '082' || lpad(floor(random() * 10000000)::int::text, 7, '0'),
  date '1960-01-01' + floor(random() * 20000)::int,
  now() - (random() * interval '180 days')
from generate_series(1, 30) as g;

create or replace view public.patients_per_month
with (security_invoker = true) as
with months as (
  select generate_series(
    date_trunc('month', now()) - interval '5 months',
    date_trunc('month', now()),
    interval '1 month'
  ) as month_start
)
select
  m.month_start,
  to_char(m.month_start, 'Mon YYYY') as label,
  count(p.id)::int                   as new_patients
from months m
left join public.patients p
  on date_trunc('month', p.created_at) = m.month_start
group by m.month_start
order by m.month_start;

revoke all on public.patients_per_month from anon;
grant select on public.patients_per_month to authenticated;
