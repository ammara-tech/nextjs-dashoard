'use client';

import { useActionState } from 'react';
import {
  createClinicAppointment,
  type AppointmentActionState,
} from '../lib/actions';
import type { Patient } from '../lib/data';

function localDateTime() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export default function CreateAppointmentForm({
  patients,
}: {
  patients: Patient[];
}) {
  const initialState: AppointmentActionState = {};
  const [state, formAction, pending] = useActionState(
    createClinicAppointment,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm text-[#727a90]">
        Patient
        <select
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          name="patient_id"
          required
        >
          <option value="">Select patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-[#727a90]">
        Date and time
        <input
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          defaultValue={localDateTime()}
          name="starts_at"
          required
          type="datetime-local"
        />
      </label>
      <label className="text-sm text-[#727a90]">
        Status
        <select
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          defaultValue="booked"
          name="status"
        >
          <option value="booked">Booked</option>
          <option value="done">Done</option>
          <option value="no_show">No-show</option>
        </select>
      </label>
      <div className="flex items-end">
        <button
          className="w-full rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526be8] disabled:opacity-60"
          disabled={pending}
        >
          {pending ? 'Booking…' : 'Book appointment'}
        </button>
      </div>
      {state.message && (
        <p
          aria-live="polite"
          className={`sm:col-span-2 lg:col-span-4 text-sm ${
            state.success ? 'text-emerald-700' : 'text-red-600'
          }`}
          role={state.success ? 'status' : 'alert'}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
