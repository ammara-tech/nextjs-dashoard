'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { selectDoctor } from '../lib/doctor-actions';
import type { DoctorOption } from '../lib/demo-data';

function ContinueButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-xl bg-[#1E4FD8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E2F66] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? 'Opening dashboard…' : 'Open dashboard'}
    </button>
  );
}

/**
 * Pop-up shown after a doctor signs in. Picking a doctor stores the choice and
 * loads that doctor's dashboard. It cannot be dismissed until a doctor is
 * chosen, unless one was already chosen earlier (then `dismissHref` is given).
 */
export default function DoctorPicker({
  doctors,
  currentId,
  dismissHref,
  isDemo,
}: {
  doctors: DoctorOption[];
  currentId?: string;
  dismissHref?: string;
  isDemo: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [chosen, setChosen] = useState(currentId ?? '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      aria-labelledby="doctor-picker-title"
      className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-[#e9eaf0] bg-white p-0 text-[#1E2F66] shadow-2xl backdrop:bg-[#0F172A]/60"
      onCancel={(event) => {
        // Escape must not skip the choice on a fresh sign-in.
        if (!dismissHref) event.preventDefault();
      }}
      ref={dialogRef}
    >
      <form action={selectDoctor} className="p-6">
        <p className="text-sm font-medium text-[#74809a]">Doctor sign-in</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight" id="doctor-picker-title">
          Which doctor are you?
        </h2>
        <p className="mt-1 text-sm text-[#727a90]">
          Choose a doctor to open their dashboard.
        </p>

        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Doctors</legend>
          {doctors.map((doctor) => (
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                chosen === doctor.id
                  ? 'border-[#1E4FD8] bg-[#EEF2FF]'
                  : 'border-[#e9eaf0] hover:bg-[#f7f8fc]'
              }`}
              key={doctor.id}
            >
              <input
                checked={chosen === doctor.id}
                className="h-4 w-4 border-[#c9cdd9] text-[#1E4FD8] focus:ring-[#1E4FD8]"
                name="doctor_id"
                onChange={() => setChosen(doctor.id)}
                required
                type="radio"
                value={doctor.id}
              />
              <span>
                <span className="block font-semibold">{doctor.display_name}</span>
                <span className="block text-sm text-[#727a90]">{doctor.specialty}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {isDemo ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            No doctors are set up in the database yet, so sample doctors are shown.
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          {dismissHref ? (
            <Link
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#626b82] hover:bg-[#f7f8fc]"
              href={dismissHref}
            >
              Cancel
            </Link>
          ) : null}
          <ContinueButton disabled={!chosen} />
        </div>
      </form>
    </dialog>
  );
}
