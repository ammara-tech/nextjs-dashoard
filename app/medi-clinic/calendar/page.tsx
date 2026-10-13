import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getClinicAccess } from '../lib/access';
import {
  fetchAppointments,
  fetchClinicProviders,
  fetchProviderShifts,
  type Appointment,
  type ProviderShift,
} from '../lib/data';
import { loadDoctorSchedule, requireSelectedDoctor } from '../lib/doctor-context';
import { dayKey } from '../lib/demo-data';
import ChartHoverArea from '@/app/ui/chart-hover';
import { tip } from '@/app/ui/chart-tip';
import { getT } from '@/app/lib/lang';

const ROW = 72; // pixels per hour (a 30 minute visit is 36px: room for two lines)
const DEFAULT_TZ = 'Africa/Johannesburg';

function minutesInDay(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

type Placed = {
  appointment: Appointment;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

/** Puts overlapping appointments side by side instead of on top of each other. */
function layout(items: { appointment: Appointment; start: number; end: number }[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((item) => item.lane + 1));
    cluster.forEach((item) => (item.lanes = lanes));
    placed.push(...cluster);
    cluster = [];
    clusterEnd = -1;
  };
  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    const used = new Set(
      cluster.filter((other) => other.end > item.start).map((other) => other.lane),
    );
    let lane = 0;
    while (used.has(lane)) lane += 1;
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) flush();
  return placed;
}

const statusStyle: Record<Appointment['status'], string> = {
  booked: 'border-[#1E4FD8] bg-[#EEF2FF] text-[#1E2F66]',
  done: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  no_show: 'border-rose-500 bg-rose-50 text-rose-700',
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; doctor?: string }>;
}) {
  const params = await searchParams;
  const { t, lang } = await getT();
  const access = await getClinicAccess();
  if (!['owner', 'admin', 'front_desk', 'doctor'].includes(access.role)) {
    redirect('/medi-clinic');
  }

  let appointments: Appointment[] = [];
  let shifts: ProviderShift[] = [];
  let doctors: { id: string; name: string }[] = [];
  let focusId: string | null = null;
  let timeZone = DEFAULT_TZ;
  let doctorName: string | null = null;

  if (access.role === 'doctor') {
    const { selected } = await requireSelectedDoctor();
    const schedule = await loadDoctorSchedule(selected);
    appointments = schedule.appointments;
    shifts = schedule.shifts;
    focusId = selected.id;
    doctorName = selected.display_name;
    timeZone = selected.time_zone || DEFAULT_TZ;
  } else {
    const [allAppointments, providers, allShifts] = await Promise.all([
      fetchAppointments(),
      fetchClinicProviders(),
      fetchProviderShifts(),
    ]);
    doctors = providers.map((provider) => ({ id: provider.id, name: provider.display_name }));
    const chosen = providers.find((provider) => provider.id === params.doctor);
    if (chosen) {
      focusId = chosen.id;
      doctorName = chosen.display_name;
      timeZone = chosen.time_zone || DEFAULT_TZ;
      appointments = allAppointments.filter((item) => item.provider_id === chosen.id);
      shifts = allShifts.filter((shift) => shift.provider_id === chosen.id);
    } else {
      appointments = allAppointments;
    }
  }

  // The week shown: Monday to Sunday in the clinic's time zone.
  const todayKey = dayKey(new Date(), timeZone);
  const baseKey = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? '') ? (params.week as string) : todayKey;
  const base = new Date(`${baseKey}T00:00:00Z`);
  const monday = new Date(base.getTime() - ((base.getUTCDay() + 6) % 7) * 86_400_000);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getTime() + index * 86_400_000);
    return {
      key: date.toISOString().slice(0, 10),
      weekday: date.getUTCDay(),
      short: date.toLocaleDateString(lang === 'af' ? 'af-ZA' : 'en-GB', { timeZone: 'UTC', weekday: 'short' }),
      date: date.toLocaleDateString(lang === 'af' ? 'af-ZA' : 'en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }),
    };
  });
  const linkFor = (offsetDays: number | null) => {
    const target =
      offsetDays === null
        ? todayKey
        : new Date(monday.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
    const query = new URLSearchParams({ week: target });
    if (focusId && access.role !== 'doctor') query.set('doctor', focusId);
    return `/medi-clinic/calendar?${query.toString()}`;
  };

  const weekItems = days.map((day) =>
    appointments
      .filter((appointment) => dayKey(new Date(appointment.starts_at), timeZone) === day.key)
      .map((appointment) => {
        const start = minutesInDay(appointment.starts_at, timeZone);
        return {
          appointment,
          start,
          end: start + Math.max(appointment.duration_minutes ?? 30, 20),
        };
      }),
  );
  const total = weekItems.reduce((sum, items) => sum + items.length, 0);

  // Visible hours: 07:00 to 18:00, widened to fit any appointment or shift.
  const edges = [
    ...weekItems.flat().flatMap((item) => [item.start, item.end]),
    ...shifts.flatMap((shift) => [toMinutes(shift.starts_at), toMinutes(shift.ends_at)]),
  ];
  const startHour = Math.max(0, Math.min(7, Math.floor(Math.min(...edges, 420) / 60)));
  const endHour = Math.min(24, Math.max(18, Math.ceil(Math.max(...edges, 1080) / 60)));
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const height = hours.length * ROW;

  const counts = { booked: 0, done: 0, no_show: 0 };
  weekItems.flat().forEach((item) => (counts[item.appointment.status] += 1));

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'border-[#1E2F66] bg-[#1E2F66] text-white'
        : 'border-[#e3e8f5] bg-white text-[#727a90] hover:bg-[#EEF2FF]'
    }`;

  const tipFor = (appointment: Appointment, start: number, end: number) =>
    tip({
      title: appointment.patients.full_name,
      rows: [
        { label: lang === 'af' ? 'Tyd' : 'Time', value: `${clock(start)}–${clock(end)}` },
        {
          label: lang === 'af' ? 'Tipe' : 'Type',
          value: appointment.clinic_appointment_types?.name ?? 'Appointment',
        },
        {
          label: t('cal.doctor'),
          value: appointment.clinic_providers?.display_name ?? doctorName ?? '—',
        },
        { label: 'Status', value: appointment.status.replace('_', ' ') },
      ],
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#74809a]">{t('cal.subtitle')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {t('cal.title')}
            {doctorName ? <span className="text-[#1E4FD8]"> · {doctorName}</span> : null}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link className={chip(false)} href={linkFor(-7)}>
            ← {t('ui.previous')}
          </Link>
          <Link className={chip(false)} href={linkFor(null)}>
            {t('ui.today')}
          </Link>
          <Link className={chip(false)} href={linkFor(7)}>
            {t('ui.nextWeek')} →
          </Link>
        </div>
      </div>

      {access.role !== 'doctor' && doctors.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            className={chip(!focusId)}
            href={`/medi-clinic/calendar?week=${days[0].key}`}
          >
            {t('cal.allDoctors')}
          </Link>
          {doctors.map((doctor) => (
            <Link
              className={chip(focusId === doctor.id)}
              href={`/medi-clinic/calendar?week=${days[0].key}&doctor=${doctor.id}`}
              key={doctor.id}
            >
              {doctor.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#727a90]">
        <span className="font-semibold text-[#1E2F66]">
          {total} {t('cal.total')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1E4FD8]" /> {t('cal.booked')} {counts.booked}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('cal.done')} {counts.done}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {t('cal.noShow')} {counts.no_show}
        </span>
        {focusId ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded bg-[#E6F7F5] ring-1 ring-[#0D9488]/40" /> {t('cal.available')}
          </span>
        ) : null}
      </div>

      {focusId ? (
        // One doctor: a time grid with their available hours shaded.
        <ChartHoverArea className="overflow-x-auto rounded-2xl border border-[#e9eaf0] bg-white shadow-sm">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-[#e9eaf0]">
              <div />
              {days.map((day) => (
                <div
                  className={`px-2 py-3 text-center ${day.key === todayKey ? 'bg-[#EEF2FF]' : ''}`}
                  key={day.key}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8b91a3]">
                    {day.short}
                  </p>
                  <p
                    className={`text-sm font-bold ${day.key === todayKey ? 'text-[#1E4FD8]' : 'text-[#1E2F66]'}`}
                  >
                    {day.date}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
              <div className="relative" style={{ height }}>
                {hours.map((hour, index) => (
                  <span
                    className="absolute right-2 -translate-y-1/2 text-[11px] text-[#8b91a3]"
                    key={hour}
                    style={{ top: index * ROW }}
                  >
                    {index === 0 ? '' : clock(hour * 60)}
                  </span>
                ))}
              </div>
              {days.map((day, dayIndex) => {
                const placed = layout(weekItems[dayIndex]);
                const dayShifts = shifts.filter((shift) => shift.weekday === day.weekday);
                return (
                  <div
                    className={`relative border-l border-[#e9eaf0] ${day.key === todayKey ? 'bg-[#EEF2FF]/40' : ''}`}
                    key={day.key}
                    style={{ height }}
                  >
                    {hours.map((hour, index) => (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 border-t border-[#eff0f4]"
                        key={hour}
                        style={{ top: index * ROW }}
                      />
                    ))}
                    {dayShifts.map((shift) => {
                      const from = toMinutes(shift.starts_at);
                      const to = toMinutes(shift.ends_at);
                      return (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 bg-[#E6F7F5]/80 ring-1 ring-inset ring-[#0D9488]/25"
                          key={shift.id}
                          style={{
                            top: ((from - startHour * 60) / 60) * ROW,
                            height: ((to - from) / 60) * ROW,
                          }}
                        />
                      );
                    })}
                    {placed.map(({ appointment, start, end, lane, lanes }) => (
                      <button
                        className={`absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left leading-tight shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7FFF] ${statusStyle[appointment.status]}`}
                        data-tip={tipFor(appointment, start, end)}
                        key={appointment.id}
                        style={{
                          top: ((start - startHour * 60) / 60) * ROW + 1,
                          height: Math.max(((end - start) / 60) * ROW - 2, 34),
                          left: `calc(${(lane / lanes) * 100}% + 3px)`,
                          width: `calc(${100 / lanes}% - 6px)`,
                        }}
                        type="button"
                      >
                        <span className="block break-words text-xs font-semibold">
                          {appointment.patients.full_name}
                        </span>
                        <span className="block truncate text-[11px] opacity-80">
                          {clock(start)} · {appointment.clinic_appointment_types?.name ?? 'Appointment'}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </ChartHoverArea>
      ) : (
        // All doctors: each day lists its visits in time order, so every full
        // name, time and doctor is readable even when several doctors are busy
        // at the same hour.
        <ChartHoverArea className="overflow-x-auto rounded-2xl border border-[#e9eaf0] bg-white shadow-sm">
          <div className="grid min-w-[1120px] grid-cols-7">
            {days.map((day, dayIndex) => {
              const items = [...weekItems[dayIndex]].sort((a, b) => a.start - b.start);
              return (
                <div
                  className={`border-l border-[#e9eaf0] first:border-l-0 ${day.key === todayKey ? 'bg-[#EEF2FF]/40' : ''}`}
                  key={day.key}
                >
                  <div
                    className={`border-b border-[#e9eaf0] px-2 py-3 text-center ${day.key === todayKey ? 'bg-[#EEF2FF]' : ''}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8b91a3]">
                      {day.short}
                    </p>
                    <p
                      className={`text-sm font-bold ${day.key === todayKey ? 'text-[#1E4FD8]' : 'text-[#1E2F66]'}`}
                    >
                      {day.date}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8b91a3]">{items.length}</p>
                  </div>
                  <ul className="space-y-2 p-2">
                    {items.length === 0 ? (
                      <li className="py-6 text-center text-xs text-[#b0b6c6]">—</li>
                    ) : (
                      items.map(({ appointment, start, end }) => (
                        <li key={appointment.id}>
                          <button
                            className={`block w-full rounded-xl border-l-4 px-2.5 py-2 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7FFF] ${statusStyle[appointment.status]}`}
                            data-tip={tipFor(appointment, start, end)}
                            type="button"
                          >
                            <span className="block text-[11px] font-bold tracking-wide opacity-80">
                              {clock(start)}–{clock(end)}
                            </span>
                            <span className="mt-0.5 block break-words text-[13px] font-semibold leading-snug">
                              {appointment.patients.full_name}
                            </span>
                            <span className="mt-0.5 block break-words text-[11px] leading-snug opacity-80">
                              {appointment.clinic_appointment_types?.name ?? 'Appointment'}
                            </span>
                            {appointment.clinic_providers?.display_name ? (
                              <span className="mt-1 block break-words text-[11px] font-medium leading-snug text-[#0F766E]">
                                {appointment.clinic_providers.display_name}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </ChartHoverArea>
      )}

      {total === 0 ? (
        <p className="rounded-xl bg-[#f7f8fc] px-4 py-5 text-sm text-[#7b8296]">{t('cal.empty')}</p>
      ) : null}
    </div>
  );
}
