'use client';

import { useActionState } from 'react';
import { useT } from '@/app/ui/i18n-provider';
import { updateMyProfile, type ProfileState } from '../lib/profile-actions';

type Profile = {
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  patient_number: string | null;
};

const field = 'mt-1 block w-full rounded-lg border-[#e3e5eb] text-sm';
const label = 'block text-xs font-medium text-[#404960]';

export default function ProfileForm({ profile, loginEmail }: { profile: Profile; loginEmail: string | null }) {
  const t = useT();
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateMyProfile, {});

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{t('profile.title')}</h2>
      <p className="mt-1 text-sm text-[#727a90]">{t('profile.subtitle')}</p>
      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>
          {t('profile.name')}
          <input
            autoComplete="name"
            className={field}
            defaultValue={profile.full_name}
            maxLength={80}
            name="full_name"
            required
          />
        </label>
        <label className={label}>
          {t('profile.phone')}
          <input
            autoComplete="tel"
            className={field}
            defaultValue={profile.phone ?? ''}
            name="phone"
            placeholder="+27 82 123 4567"
            type="tel"
          />
        </label>
        <label className={label}>
          {t('profile.email')}
          <input
            autoComplete="email"
            className={field}
            defaultValue={profile.email ?? loginEmail ?? ''}
            name="email"
            type="email"
          />
        </label>
        <label className={label}>
          {t('profile.dob')}
          <input
            className={field}
            defaultValue={profile.date_of_birth ?? ''}
            max={new Date().toISOString().slice(0, 10)}
            name="date_of_birth"
            type="date"
          />
        </label>
        <div className="sm:col-span-2">
          <p className="text-xs text-[#8b91a3]">
            {t('profile.number')}: <span className="font-semibold text-[#404960]">{profile.patient_number ?? '—'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            className="rounded-xl bg-[#1E4FD8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66] disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? t('ui.saving') : t('ui.save')}
          </button>
          {state.message ? (
            <p
              aria-live="polite"
              className={`text-sm ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
              role={state.success ? 'status' : 'alert'}
            >
              {state.success ? t('profile.saved') : state.message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
