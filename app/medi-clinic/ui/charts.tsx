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
  booked: '#5b7cfa',
  done: '#31b78a',
  no_show: '#f18b68',
};

export function NewPatientsChart({
  data,
}: {
  data: MonthlyPatientCount[];
}) {
  const maxCount = Math.max(1, ...data.map((item) => item.count));

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#798096]">Practice growth</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20263b]">
            New patients
          </h2>
        </div>
        <span className="rounded-full bg-[#f1f3ff] px-3 py-1 text-xs font-semibold text-[#586de0]">
          Last 6 months
        </span>
      </div>
      <div
        aria-label="New patients by month for the last six months"
        className="mt-8 grid h-48 grid-cols-6 items-end gap-3"
        role="img"
      >
        {data.map((item) => (
          <div
            className="flex h-full flex-col items-center justify-end gap-2"
            key={item.label}
          >
            <span className="text-xs font-semibold text-[#737b91]">
              {item.count}
            </span>
            <div className="flex h-36 w-full items-end rounded-t-lg bg-[#f5f6fb]">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[#647cf5] to-[#8b9cff]"
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
        ))}
      </div>
    </section>
  );
}

export function AppointmentStatusChart({
  data,
}: {
  data: AppointmentStatusCount[];
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let cumulative = 0;
  const segments = data.map((item) => {
    const start = cumulative;
    cumulative += total === 0 ? 0 : (item.count / total) * 100;
    return `${statusColors[item.status]} ${start}% ${cumulative}%`;
  });
  const background =
    total === 0 ? '#e9eaf0' : `conic-gradient(${segments.join(', ')})`;

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <div>
        <p className="text-sm font-medium text-[#798096]">This month</p>
        <h2 className="mt-1 text-lg font-semibold text-[#20263b]">
          Appointment outcomes
        </h2>
      </div>
      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        <div
          aria-label={`${total} appointments this month`}
          className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
          role="img"
          style={{ background }}
        >
          <div className="grid h-28 w-28 place-content-center rounded-full bg-white text-center">
            <span className="text-3xl font-bold text-[#20263b]">{total}</span>
            <span className="text-xs text-[#8b91a3]">appointments</span>
          </div>
        </div>
        <ul className="w-full space-y-3 sm:w-auto">
          {data.map((item) => (
            <li
              className="flex min-w-36 items-center justify-between gap-5 text-sm"
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
    </section>
  );
}
