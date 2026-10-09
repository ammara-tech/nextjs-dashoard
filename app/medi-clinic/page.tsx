import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AppointmentStatusChart,
  NewPatientsChart,
} from './ui/charts';
import { fetchClinicDashboard, fetchTomorrowAppointments } from './lib/data';
import { getClinicAccess } from './lib/access';

export default async function MediClinicPage() {
  const { role } = await getClinicAccess();
  if (role === 'patient') redirect('/medi-clinic/portal');
  const [dashboardResult, tomorrowAppointmentsResult] = await Promise.allSettled([
    fetchClinicDashboard(),
    fetchTomorrowAppointments(),
  ]);
  const dashboard =
    dashboardResult.status === 'fulfilled'
      ? dashboardResult.value
      : {
          monthlyPatients: [],
          appointmentStatuses: [],
        };
  const tomorrowAppointments =
    tomorrowAppointmentsResult.status === 'fulfilled'
      ? tomorrowAppointmentsResult.value
      : [];
  const dashboardLoadFailed =
    dashboardResult.status === 'rejected' ||
    tomorrowAppointmentsResult.status === 'rejected';
  const newPatients = dashboard.monthlyPatients.reduce(
    (sum, month) => sum + month.count,
    0,
  );
  const noShows =
    dashboard.appointmentStatuses.find((item) => item.status === 'no_show')
      ?.count ?? 0;
  const appointmentTotal = dashboard.appointmentStatuses.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const noShowRate =
    appointmentTotal === 0
      ? '0%'
      : `${Math.round((noShows / appointmentTotal) * 100)}%`;

  return (
    <div className="space-y-8">
      {dashboardLoadFailed ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some clinic data could not be loaded for this account yet. If you just
          signed in as an administrator, make sure the clinic owner link and
          database access policies have been configured.
          {[dashboardResult, tomorrowAppointmentsResult].map((result, index) =>
            result.status === 'rejected' ? (
              <span className="mt-1 block font-mono text-xs" key={index}>
                {result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason)}
              </span>
            ) : null,
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#74809a]">
            Your weekly practice snapshot
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#20263b]">
            Good morning
          </h1>
        </div>
        <Link
          className="rounded-xl bg-[#1E4FD8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E2F66]"
          href="/medi-clinic/appointments"
        >
          + Book appointment
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          accent="bg-[#1E4FD8]"
          label="New patients"
          note="Across the last 6 months"
          value={newPatients}
        />
        <MetricCard
          accent="bg-[#5B7FFF]"
          label="Appointments this month"
          note={`${noShows} no-shows recorded`}
          value={appointmentTotal}
        />
        <MetricCard
          accent="bg-[#1E2F66]"
          label="No-show share"
          note="This month’s appointment rate"
          value={noShowRate}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <NewPatientsChart data={dashboard.monthlyPatients} />
        <AppointmentStatusChart data={dashboard.appointmentStatuses} />
      </div>

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#798096]">Plan ahead</p>
            <h2 className="mt-1 text-lg font-semibold text-[#20263b]">
              Tomorrow’s booked appointments
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-[#1E4FD8] hover:text-[#465fd4]"
            href="/medi-clinic/tomorrow"
          >
            View all
          </Link>
        </div>
        {tomorrowAppointments.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[#f7f8fc] px-4 py-5 text-sm text-[#7b8296]">
            No booked appointments for tomorrow.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#eff0f4]">
            {tomorrowAppointments.slice(0, 5).map((appointment) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={appointment.id}
              >
                <div>
                  <p className="font-medium">{appointment.patients.full_name}</p>
                  <p className="text-sm text-[#848b9e]">
                    {appointment.patients.phone || 'No phone number'}
                  </p>
                </div>
                <time className="text-sm font-medium text-[#68718a]">
                  {new Date(appointment.starts_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  accent,
  label,
  note,
  value,
}: {
  accent: string;
  label: string;
  note: string;
  value: number | string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />
      <p className="text-sm font-medium text-[#798096]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#1E2F66]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[#9298a8]">{note}</p>
    </section>
  );
}
