'use client';

import { useActionState } from 'react';
import {
  createClinicAppointment,
  type AppointmentActionState,
} from '../lib/actions';
import type {
  ClinicAppointmentType,
  ClinicProvider,
  Patient,
} from '../lib/data';

export default function CreateAppointmentForm({
  appointmentTypes,
  patientId,
  patients,
  providers,
}: {
  appointmentTypes: ClinicAppointmentType[];
  patientId?: string;
  patients: Patient[];
  providers: ClinicProvider[];
}) {
  const initialState: AppointmentActionState = {};
  const [state, formAction, pending] = useActionState(
    createClinicAppointment,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {patientId && (
        <input name="patient_id" type="hidden" value={patientId} />
      )}
      {!patientId && (
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
      )}
      <label className="text-sm text-[#727a90]">
        Provider
        <select
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          name="provider_id"
          required
        >
          <option value="">Select provider</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.display_name} — {provider.specialty} ({provider.time_zone})
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-[#727a90]">
        Appointment type
        <select
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          name="appointment_type_id"
          required
        >
          <option value="">Select type</option>
          {appointmentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({type.duration_minutes} min)
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-[#727a90]">
        Date and time
        <input
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          name="starts_at"
          required
          type="datetime-local"
        />
        <span className="mt-1 block text-xs text-[#9298a8]">
          Times are interpreted in the provider’s configured time zone.
        </span>
      </label>
      <div className="flex items-end">
        <button
          className="w-full rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66] disabled:opacity-60"
          disabled={pending}
        >
          {pending ? 'Booking…' : 'Book appointment'}
        </button>
      </div>
      {state.message && (
        <p
          aria-live="polite"
          className={`sm:col-span-2 lg:col-span-3 text-sm ${
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
