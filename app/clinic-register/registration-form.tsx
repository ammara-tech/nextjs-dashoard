'use client';

import { useActionState } from 'react';
import {
  registerPatient,
  type RegistrationState,
} from './actions';

export default function PatientRegistrationForm() {
  const [state, formAction, pending] = useActionState<RegistrationState, FormData>(
    registerPatient,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-[#404960]">
        Full name
        <input
          autoComplete="name"
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          maxLength={160}
          name="full_name"
          required
        />
      </label>
      <label className="block text-sm font-medium text-[#404960]">
        Phone number
        <input
          autoComplete="tel"
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          maxLength={20}
          name="phone"
          required
          type="tel"
        />
      </label>
      <label className="block text-sm font-medium text-[#404960]">
        Date of birth
        <input
          autoComplete="bday"
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          max={new Date().toISOString().slice(0, 10)}
          name="date_of_birth"
          required
          type="date"
        />
      </label>
      <label className="block text-sm font-medium text-[#404960]">
        Email
        <input
          autoComplete="email"
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-medium text-[#404960]">
        Password
        <input
          autoComplete="new-password"
          className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
          minLength={8}
          name="password"
          required
          type="password"
        />
        <span className="mt-1 block text-xs font-normal text-[#9298a8]">
          Use at least 8 characters.
        </span>
      </label>
      <button
        className="w-full rounded-xl bg-[#647cf5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#526be8] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Creating account…' : 'Create patient account'}
      </button>
      {state.message && (
        <p
          aria-live="polite"
          className={`text-sm ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
          role={state.success ? 'status' : 'alert'}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
