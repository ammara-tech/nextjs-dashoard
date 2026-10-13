import ChartHoverArea from '@/app/ui/chart-hover';
import { tip } from '@/app/ui/chart-tip';
import type {
  AppointmentStatusCount,
  MonthlyPatientCount,
} from '../lib/data';

const statusLabels: Record<AppointmentStatusCount['status'], string> = {
  booked: 'Booked',
  done: 'Completed',
  no_show: 'No-show',
};

const statusColors: Record<AppointmentStatusCount['status'], string> = {
  booked: '#1E4FD8',
  done: '#31b78a',
  no_show: '#f18b68',
};

export function NewPatientsChart({
  data,
}: {
  data: MonthlyPatientCount[];
}) {
  const maxCount = Math.max(1, ...data.map((item) => item.count));
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#798096]">Practice growth</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20263b]">
            New patients
          </h2>
        </div>
        <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E4FD8]">
          Last 6 months
        </span>
      </div>
      <ChartHoverArea>
        <div
          aria-label="New patients by month for the last six months. Hover or focus a bar for details."
          className="mt-8 grid h-48 grid-cols-6 items-end gap-3"
          role="group"
        >
          {data.map((item, index) => {
            const previous = index > 0 ? data[index - 1].count : null;
            const change =
              previous === null
                ? 'First month shown'
                : item.count === previous
                  ? 'No change'
                  : `${item.count > previous ? '+' : '-'}${Math.abs(item.count - previous)} vs ${data[index - 1].label}`;
            const share = total === 0 ? 0 : Math.round((item.count / total) * 100);
            return (
              <div
                aria-label={`${item.label}: ${item.count} new patients. ${change}.`}
                className="group flex h-full cursor-pointer flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#5B7FFF]"
                data-tip={tip({
                  title: `${item.label}`,
                  rows: [
                    { label: 'New patients', value: String(item.count), color: '#1E4FD8' },
                    { label: 'Change', value: change },
                    { label: 'Share of 6 months', value: `${share}%` },
                  ],
                  footnote: `${total} new patients in the last 6 months`,
                })}
                key={item.label}
                tabIndex={0}
              >
                <span className="text-xs font-semibold text-[#737b91]">
                  {item.count}
                </span>
                <div className="flex h-36 w-full items-end rounded-t-lg bg-[#f5f6fb] transition group-hover:bg-[#eceffa]">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#1E4FD8] to-[#9CC9FF] transition group-hover:brightness-110"
                    style={{
                      height:
                        item.count === 0
                          ? '0%'
                          : `${Math.max(5, (item.count / maxCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-[#8b91a3]">{item.label}</span>
              </div>
            );
          })}
        </div>
      </ChartHoverArea>
    </section>
  );
}

export function AppointmentStatusChart({
  data,
}: {
  data: AppointmentStatusCount[];
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = data.map((item) => {
    const length = total === 0 ? 0 : (item.count / total) * circumference;
    const segment = { item, length, offset };
    offset += length;
    return segment;
  });
  const tipFor = (item: AppointmentStatusCount) =>
    tip({
      title: statusLabels[item.status],
      rows: [
        { label: 'Appointments', value: String(item.count), color: statusColors[item.status] },
        {
          label: 'Share of month',
          value: total === 0 ? '0%' : `${Math.round((item.count / total) * 100)}%`,
        },
        { label: 'Month total', value: String(total) },
      ],
    });

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <div>
        <p className="text-sm font-medium text-[#798096]">This month</p>
        <h2 className="mt-1 text-lg font-semibold text-[#20263b]">
          Appointment outcomes
        </h2>
      </div>
      <ChartHoverArea className="mt-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <div className="relative h-40 w-40 shrink-0">
            <svg
              aria-label={`${total} appointments this month. Hover or focus a segment for details.`}
              className="h-40 w-40 -rotate-90"
              role="group"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                fill="none"
                r={radius}
                stroke="#e9eaf0"
                strokeWidth="24"
              />
              {segments.map(({ item, length, offset: start }) =>
                length > 0 ? (
                  <circle
                    aria-label={`${statusLabels[item.status]}: ${item.count} appointments`}
                    className="cursor-pointer outline-none transition hover:opacity-80 focus-visible:opacity-80"
                    cx="80"
                    cy="80"
                    data-tip={tipFor(item)}
                    fill="none"
                    key={item.status}
                    r={radius}
                    stroke={statusColors[item.status]}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-start}
                    strokeWidth="24"
                    tabIndex={0}
                  />
                ) : null,
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <span className="text-3xl font-bold text-[#20263b]">{total}</span>
              <span className="text-xs text-[#8b91a3]">appointments</span>
            </div>
          </div>
          <ul className="w-full space-y-3 sm:w-auto">
            {data.map((item) => (
              <li
                className="flex min-w-36 cursor-pointer items-center justify-between gap-5 rounded-md text-sm hover:bg-[#f5f6fb]"
                data-tip={tipFor(item)}
                key={item.status}
              >
                <span className="flex items-center gap-2 text-[#737b91]">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[item.status] }}
                  />
                  {statusLabels[item.status]}
                </span>
                <span className="font-semibold text-[#20263b]">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartHoverArea>
    </section>
  );
}

/** Doctor dashboard: this week's appointments (Monday to Sunday) by day and outcome. */
export function WeekAppointmentsChart({
  days,
}: {
  days: { label: string; date: string; booked: number; done: number; noShow: number }[];
}) {
  const totals = days.map((day) => day.booked + day.done + day.noShow);
  const max = Math.max(1, ...totals);
  const weekTotal = totals.reduce((sum, value) => sum + value, 0);

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#798096]">This week</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20263b]">
            Appointments by day
          </h2>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-[#737b91]">
          {(['booked', 'done', 'no_show'] as const).map((status) => (
            <li className="flex items-center gap-1.5" key={status}>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: statusColors[status] }}
              />
              {statusLabels[status]}
            </li>
          ))}
        </ul>
      </div>
      <ChartHoverArea>
        <div
          aria-label="Appointments this week by day. Hover or focus a bar for details."
          className="mt-6 grid h-44 grid-cols-7 items-end gap-3"
          role="group"
        >
          {days.map((day, index) => {
            const total = totals[index];
            const parts = [
              { key: 'booked' as const, count: day.booked },
              { key: 'done' as const, count: day.done },
              { key: 'no_show' as const, count: day.noShow },
            ];
            return (
              <div
                aria-label={`${day.label}: ${total} appointments`}
                className="group flex h-full cursor-pointer flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#5B7FFF]"
                data-tip={tip({
                  title: `${day.label} ${day.date}`,
                  rows: [
                    { label: 'Booked', value: String(day.booked), color: statusColors.booked },
                    { label: 'Completed', value: String(day.done), color: statusColors.done },
                    { label: 'No-show', value: String(day.noShow), color: statusColors.no_show },
                    { label: 'Day total', value: String(total) },
                  ],
                  footnote: `${weekTotal} appointments this week`,
                })}
                key={day.date}
                tabIndex={0}
              >
                <span className="text-xs font-semibold text-[#737b91]">{total}</span>
                <div className="flex h-32 w-full flex-col-reverse overflow-hidden rounded-t-lg bg-[#f5f6fb] transition group-hover:bg-[#eceffa]">
                  {parts.map((part) =>
                    part.count > 0 ? (
                      <div
                        className="w-full transition group-hover:brightness-110"
                        key={part.key}
                        style={{
                          backgroundColor: statusColors[part.key],
                          height: `${(part.count / max) * 100}%`,
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <span className="text-xs text-[#8b91a3]">{day.label}</span>
              </div>
            );
          })}
        </div>
      </ChartHoverArea>
    </section>
  );
}
