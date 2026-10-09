'use client';

import { useActionState } from 'react';
import type { PatientState } from '@/app/lib/actions';

type PatientValues = {
  full_name?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
};

const inputClass =
  'mt-1 block w-full rounded-xl border border-[#e3e5eb] bg-white px-3 py-2.5 text-sm text-[#20263b] placeholder:text-[#9298a8] focus:border-[#647cf5] focus:outline-none focus:ring-2 focus:ring-[#647cf5]/20';

const labelClass = 'block text-sm font-medium text-[#404960]';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {messages[0]}
    </p>
  );
}

export default function PatientForm({
  action,
  patient,
  submitLabel,
}: {
  // createPatient, or updatePatient.bind(null, patientId)
  action: (state: PatientState, formData: FormData) => Promise<PatientState>;
  patient?: PatientValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PatientState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="full_name">
          Full name
        </label>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={patient?.full_name ?? ''}
          id="full_name"
          maxLength={160}
          name="full_name"
          placeholder="e.g. Jane Smith"
          required
        />
        <FieldError messages={state.errors?.full_name} />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">
          Phone number
        </label>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={patient?.phone ?? ''}
          id="phone"
          maxLength={40}
          name="phone"
          placeholder="e.g. 082 123 4567"
          type="tel"
        />
        <FieldError messages={state.errors?.phone} />
      </div>

      <div>
        <label className={labelClass} htmlFor="date_of_birth">
          Date of birth
        </label>
        <input
          className={inputClass}
          defaultValue={patient?.date_of_birth ?? ''}
          id="date_of_birth"
          name="date_of_birth"
          type="date"
        />
        <FieldError messages={state.errors?.date_of_birth} />
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={patient?.email ?? ''}
          id="email"
          maxLength={254}
          name="email"
          placeholder="e.g. jane@example.com"
          type="email"
        />
        <FieldError messages={state.errors?.email} />
      </div>

      <button
        className="w-full rounded-xl bg-[#647cf5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#526be8] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>

      {state.message && (
        <p aria-live="polite" className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
