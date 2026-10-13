'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useT } from '@/app/ui/i18n-provider';
import { submitClaim, type ClaimActionState } from '../actions';

export default function ClaimForm() {
  const t = useT();
  const [state, action, pending] = useActionState<ClaimActionState, FormData>(submitClaim, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end" ref={form}>
      <label className="block text-xs font-medium text-[#404960]">
        {t('claims.description')}
        <input
          className="mt-1 block w-full rounded-lg border-[#e3e5eb] text-sm"
          maxLength={200}
          name="description"
          placeholder="e.g. GP consultation"
          required
        />
      </label>
      <label className="block text-xs font-medium text-[#404960]">
        {t('claims.amount')}
        <input
          className="mt-1 block w-full rounded-lg border-[#e3e5eb] text-sm"
          inputMode="decimal"
          min="0.01"
          name="amount"
          placeholder="850.00"
          required
          step="0.01"
          type="number"
        />
      </label>
      <button
        className="rounded-xl bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? t('ui.saving') : t('claims.submit')}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`text-sm sm:col-span-3 ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
          role={state.success ? 'status' : 'alert'}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
