import Link from 'next/link';
import type { Appointment, ProviderShift } from '../lib/data';
import { dayKey, type DoctorOption } from '../lib/demo-data';
import WeeklyShifts from './weekly-shifts';

type Schedule = {
  appointments: Appointment[];
  shifts: ProviderShift[];
  sampleAppointments: boolean;
  sampleShifts: boolean;
};

export function formatClock(value: string, timeZone: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(value: string, timeZone: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function SampleBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </p>
  );
}

function statusStyles(status: Appointment['status']) {
  if (status === 'done') return 'bg-emerald-50 text-emerald-700';
  if (status === 'no_show') return 'bg-rose-50 text-rose-700';
  return 'bg-[#EEF2FF] text-[#1E4FD8]';
}

export function StatusPill({ status }: { status: Appointment['status'] }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles(status)}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function Metric({
  label,
  note,
  value,
  accent,
}: {
  label: string;
  note: string;
  value: number;
  accent: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />
      <p className="text-sm font-medium text-[#798096]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#1E2F66]">{value}</p>
      <p className="mt-1 text-xs text-[#9298a8]">{note}</p>
    </section>
  );
}

function AppointmentRows({
  appointments,
  showDay,
  timeZone,
}: {
  appointments: Appointment[];
  showDay: boolean;
  timeZone: string;
}) {
  return (
    <ul className="divide-y divide-[#eff0f4]">
      {appointments.map((appointment) => (
        <li
          className="flex flex-wrap items-center justify-between gap-3 py-3"
          key={appointment.id}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 text-sm font-semibold text-[#1E2F66]">
              {showDay ? (
                <span className="block text-xs font-medium text-[#727a90]">
                  {formatDay(appointment.starts_at, timeZone)}
                </span>
              ) : null}
              {formatClock(appointment.starts_at, timeZone)}
            </div>
            <div>
              <p className="font-medium">{appointment.patients.full_name}</p>
              <p className="text-sm text-[#848b9e]">
                {appointment.clinic_appointment_types?.name ?? 'Appointment'}
                {appointment.duration_minutes
                  ? ` · ${appointment.duration_minutes} min`
                  : ''}
              </p>
            </div>
          </div>
          <StatusPill status={appointment.status} />
        </li>
      ))}
    </ul>
  );
}

export default function DoctorDashboard({
  doctor,
  schedule,
}: {
  doctor: DoctorOption;
  schedule: Schedule;
}) {
  const timeZone = doctor.time_zone || 'Africa/Johannesburg';
  const now = new Date();
  const todayKey = dayKey(now, timeZone);
  const weekAheadKey = dayKey(new Date(now.getTime() + 7 * 86_400_000), timeZone);
  const weekBackKey = dayKey(new Date(now.getTime() - 7 * 86_400_000), timeZone);

  const sorted = [...schedule.appointments].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  const today = sorted.filter(
    (appointment) => dayKey(new Date(appointment.starts_at), timeZone) === todayKey,
  );
  const upcoming = sorted.filter((appointment) => {
    const key = dayKey(new Date(appointment.starts_at), timeZone);
    return appointment.status === 'booked' && key > todayKey && key <= weekAheadKey;
  });
  const recent = sorted.filter((appointment) => {
    const key = dayKey(new Date(appointment.starts_at), timeZone);
    return key >= weekBackKey && key < todayKey;
  });
  const completedRecently = recent.filter((appointment) => appointment.status === 'done').length;
  const noShowsRecently = recent.filter((appointment) => appointment.status === 'no_show').length;
  const todayRemaining = today.filter((appointment) => appointment.status === 'booked').length;
  const patientCount = new Set(sorted.map((appointment) => appointment.patient_id)).size;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#74809a]">
            {doctor.specialty} · {doctor.time_zone}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#20263b]">
            {doctor.display_name}
          </h1>
        </div>
        <Link
          className="rounded-xl border border-[#e9eaf0] bg-white px-4 py-2.5 text-sm font-medium text-[#1E4FD8] shadow-sm hover:bg-[#EEF2FF]"
          href="/medi-clinic?switch=1"
        >
          Switch doctor
        </Link>
      </div>

      {schedule.sampleAppointments || schedule.sampleShifts ? (
        <SampleBanner>
          Showing sample{' '}
          {schedule.sampleAppointments && schedule.sampleShifts
            ? 'appointments and shifts'
            : schedule.sampleAppointments
              ? 'appointments'
              : 'shifts'}{' '}
          for {doctor.display_name}. Real records appear here once they exist for
          this doctor.
        </SampleBanner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          accent="bg-[#1E4FD8]"
          label="Today"
          note={`${todayRemaining} still to see`}
          value={today.length}
        />
        <Metric
          accent="bg-[#5B7FFF]"
          label="Next 7 days"
          note="Booked appointments"
          value={upcoming.length}
        />
        <Metric
          accent="bg-[#1E2F66]"
          label="Completed (last 7 days)"
          note={`${noShowsRecently} no-shows`}
          value={completedRecently}
        />
        <Metric
          accent="bg-[#8FA8FF]"
          label="Patients"
          note="On this schedule"
          value={patientCount}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
          <h2 className="text-lg font-semibold text-[#20263b]">Today’s schedule</h2>
          {today.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[#f7f8fc] px-4 py-5 text-sm text-[#7b8296]">
              No appointments today.
            </p>
          ) : (
            <div className="mt-2">
              <AppointmentRows appointments={today} showDay={false} timeZone={timeZone} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#20263b]">Coming up</h2>
            <Link
              className="text-sm font-semibold text-[#1E4FD8] hover:text-[#465fd4]"
              href="/medi-clinic/appointments"
            >
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[#f7f8fc] px-4 py-5 text-sm text-[#7b8296]">
              Nothing booked in the next 7 days.
            </p>
          ) : (
            <div className="mt-2">
              <AppointmentRows
                appointments={upcoming.slice(0, 6)}
                showDay
                timeZone={timeZone}
              />
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#20263b]">My weekly shifts</h2>
          <Link
            className="text-sm font-semibold text-[#1E4FD8] hover:text-[#465fd4]"
            href="/medi-clinic/shifts"
          >
            Full view
          </Link>
        </div>
        <div className="mt-3">
          <WeeklyShifts shifts={schedule.shifts} />
        </div>
      </section>
    </div>
  );
}

export { AppointmentRows };
