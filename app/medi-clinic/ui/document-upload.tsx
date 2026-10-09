'use client';

import { useActionState, useEffect, useRef } from 'react';
import { uploadMyDocument, type CardActionState } from '../lib/actions';

const input =
  'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm focus:border-[#1E4FD8] focus:ring-[#1E4FD8]';

export default function DocumentUpload() {
  const initial: CardActionState = {};
  const [state, formAction, pending] = useActionState(uploadMyDocument, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      action={formAction}
      className="mt-4 grid gap-3 rounded-2xl border border-dashed border-[#9CC9FF] bg-[#EEF2FF] p-4 sm:grid-cols-[180px_1fr_auto] sm:items-end"
      ref={formRef}
    >
      <label className="text-sm font-medium">
        Category
        <select className={input} defaultValue="clinical_history" name="category">
          <option value="identity">Identity</option>
          <option value="clinical_history">Medical history</option>
          <option value="invoices">Invoices</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        File (PDF, JPG or PNG, up to 10 MB)
        <input
          accept="application/pdf,image/jpeg,image/png"
          className={`${input} bg-white`}
          name="file"
          required
          type="file"
        />
      </label>
      <button
        className="rounded-xl bg-[#1E4FD8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Uploading…' : 'Upload'}
      </button>
      {state.message && (
        <p
          className={`text-sm sm:col-span-3 ${
            state.success ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
