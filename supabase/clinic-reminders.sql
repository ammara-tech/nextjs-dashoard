-- Appointment reminders (e-mail and SMS) sent by a scheduled job.
--
-- The scheduled route /api/cron/reminders asks for appointments starting soon that
-- have not been reminded yet, sends the messages, and records them here so nobody
-- is reminded twice. Only the server's service role can use these objects; patients
-- and staff cannot read or call them. Safe to re-run.

create table if not exists public.clinic_reminder_log (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at timestamptz not null default now(),
  unique (appointment_id, channel)
);
alter table public.clinic_reminder_log enable row level security;
revoke all on public.clinic_reminder_log from anon, authenticated;

create or replace function public.appointments_due_for_reminder(p_from timestamptz, p_to timestamptz)
returns table (
  appointment_id uuid,
  starts_at timestamptz,
  patient_name text,
  email text,
  phone text,
  provider_name text,
  email_done boolean,
  sms_done boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.starts_at, p.full_name, p.email, p.phone, pr.display_name,
    exists (select 1 from public.clinic_reminder_log l where l.appointment_id = a.id and l.channel = 'email'),
    exists (select 1 from public.clinic_reminder_log l where l.appointment_id = a.id and l.channel = 'sms')
  from public.appointments a
  join public.patients p on p.id = a.patient_id
  left join public.clinic_providers pr on pr.id = a.provider_id
  where a.status = 'booked'
    and a.starts_at >= p_from
    and a.starts_at < p_to
    and p.archived_at is null
  order by a.starts_at
$$;

create or replace function public.record_reminder(p_appointment_id uuid, p_channel text, p_status text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.clinic_reminder_log (appointment_id, channel, status)
  values (p_appointment_id, p_channel, p_status)
  on conflict (appointment_id, channel) do update set status = excluded.status, sent_at = now()
$$;

revoke all on function public.appointments_due_for_reminder(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.record_reminder(uuid, text, text) from public, anon, authenticated;
grant execute on function public.appointments_due_for_reminder(timestamptz, timestamptz) to service_role;
grant execute on function public.record_reminder(uuid, text, text) to service_role;
