import type { ProviderShift } from '../lib/data';

// Working week shown as a Monday to Friday range. Postgres weekday numbers:
// 0 = Sunday ... 6 = Saturday.
export const WORK_WEEK = [
  { weekday: 1, label: 'Monday', short: 'Mon' },
  { weekday: 2, label: 'Tuesday', short: 'Tue' },
  { weekday: 3, label: 'Wednesday', short: 'Wed' },
  { weekday: 4, label: 'Thursday', short: 'Thu' },
  { weekday: 5, label: 'Friday', short: 'Fri' },
] as const;

const WEEKEND = [
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
] as const;

export function trimTime(value: string) {
  return value.slice(0, 5);
}

function rangesFor(shifts: ProviderShift[], weekday: number) {
  return shifts
    .filter((shift) => shift.weekday === weekday)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((shift) => `${trimTime(shift.starts_at)}–${trimTime(shift.ends_at)}`);
}

/** "Monday to Friday, 08:00–17:00" when every weekday has the same single shift. */
function weekSummary(shifts: ProviderShift[]) {
  const perDay = WORK_WEEK.map((day) => rangesFor(shifts, day.weekday));
  if (perDay.every((ranges) => ranges.length === 1 && ranges[0] === perDay[0][0])) {
    return `Monday to Friday, ${perDay[0][0]}`;
  }
  const working = WORK_WEEK.filter((_, index) => perDay[index].length > 0);
  if (working.length === 0) return 'No weekday shifts set';
  return `${working[0].label} to ${working[working.length - 1].label}`;
}

export default function WeeklyShifts({
  shifts,
  heading,
  note,
}: {
  shifts: ProviderShift[];
  heading?: string;
  note?: string;
}) {
  const weekendRows = WEEKEND.map((day) => ({
    label: day.label,
    ranges: rangesFor(shifts, day.weekday),
  })).filter((row) => row.ranges.length > 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading ? <h3 className="font-semibold">{heading}</h3> : <span />}
        <p className="text-sm text-[#727a90]">{weekSummary(shifts)}</p>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {WORK_WEEK.map((day) => {
          const ranges = rangesFor(shifts, day.weekday);
          return (
            <li
              className={`rounded-xl border p-3 ${
                ranges.length > 0
                  ? 'border-[#d6e0ff] bg-[#EEF2FF]'
                  : 'border-dashed border-[#e3e5eb] bg-[#fafbfe]'
              }`}
              key={day.weekday}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E4FD8]">
                <span className="sm:hidden">{day.label}</span>
                <span className="hidden sm:inline">{day.short}</span>
              </p>
              {ranges.length > 0 ? (
                ranges.map((range) => (
                  <p className="mt-1 text-sm font-medium text-[#1E2F66]" key={range}>
                    {range}
                  </p>
                ))
              ) : (
                <p className="mt-1 text-sm text-[#9298a8]">Off</p>
              )}
            </li>
          );
        })}
      </ol>
      {weekendRows.length > 0 && (
        <p className="mt-2 text-xs text-[#727a90]">
          Weekend:{' '}
          {weekendRows
            .map((row) => `${row.label} ${row.ranges.join(', ')}`)
            .join(' · ')}
        </p>
      )}
      {note ? <p className="mt-2 text-xs text-[#9298a8]">{note}</p> : null}
    </div>
  );
}
