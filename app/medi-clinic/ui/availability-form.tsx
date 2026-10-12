'use client';

import { useActionState } from 'react';
import {
  saveProviderAvailability,
  type AvailabilityState,
} from '../lib/actions';
import type { ProviderShift } from '../lib/data';

const DAYS = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
] as const;

const time = (value: string) => value.slice(0, 5);

/**
 * Lets an admin choose which days a provider works and the hours for each.
 * A day that already has more than one shift is shown as locked, so its
 * split shifts are never overwritten by accident.
 */
export default function AvailabilityForm({
  providerId,
  shifts,
}: {
  providerId: string;
  shifts: ProviderShift[];
}) {
  const [state, action, pending] = useActionState<AvailabilityState, FormData>(
    saveProviderAvailability,
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input name="provider_id" type="hidden" value={providerId} />
      <ul className="divide-y divide-[#eff0f4] rounded-xl border border-[#e9eaf0]">
        {DAYS.map((day) => {
          const forDay = shifts
            .filter((shift) => shift.weekday === day.weekday)
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const locked = forDay.length > 1;
          const first = forDay[0];
          return (
            <li
              className="flex flex-wrap items-center gap-3 px-4 py-3"
              key={`${providerId}-${day.weekday}`}
            >
              {locked ? (
                <>
                  <input name={`locked_${day.weekday}`} type="hidden" value="1" />
                  <span className="w-28 text-sm font-medium">{day.label}</span>
                  <span className="text-sm text-[#727a90]">
                    {forDay
                      .map((shift) => `${time(shift.starts_at)}–${time(shift.ends_at)}`)
                      .join(', ')}{' '}
                    (split shifts are kept as they are)
                  </span>
                </>
              ) : (
                <>
                  <label className="flex w-28 items-center gap-2 text-sm font-medium">
                    <input
                      className="rounded border-[#c9d3e8] text-[#1E4FD8]"
                      defaultChecked={Boolean(first)}
                      name={`work_${day.weekday}`}
                      type="checkbox"
                    />
                    {day.label}
                  </label>
                  <input
                    aria-label={`${day.label} start time`}
                    className="rounded-lg border-[#e3e5eb] text-sm"
                    defaultValue={first ? time(first.starts_at) : '08:00'}
                    name={`start_${day.weekday}`}
                    type="time"
                  />
                  <span className="text-sm text-[#9298a8]">to</span>
                  <input
                    aria-label={`${day.label} end time`}
                    className="rounded-lg border-[#e3e5eb] text-sm"
                    defaultValue={first ? time(first.ends_at) : '17:00'}
                    name={`end_${day.weekday}`}
                    type="time"
                  />
                </>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-xl bg-[#1E2F66] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2b4190] disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Saving…' : 'Save availability'}
        </button>
        <button
          className="rounded-xl border border-[#d6e0ff] bg-[#EEF2FF] px-4 py-2.5 text-sm font-medium text-[#1E2F66] hover:bg-[#dfe7ff] disabled:opacity-60"
          disabled={pending}
          formNoValidate
          name="preset"
          type="submit"
          value="weekdays"
        >
          Set Monday to Friday, 08:00–17:00
        </button>
        {state.message ? (
          <p
            aria-live="polite"
            className={`text-sm ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
            role={state.success ? 'status' : 'alert'}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
