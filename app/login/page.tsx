import Link from 'next/link';
import { ClinicMark } from '@/app/ui/clinic-logo';
import LoginForm from '@/app/ui/login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex w-full flex-col items-center gap-3 rounded-lg bg-[#0F172A] px-4 py-6 text-center">
          <div className="flex items-center gap-4">
            <ClinicMark className="h-14 w-14" />
            <span className="h-10 w-px bg-white/25" aria-hidden />
            <svg viewBox="0 0 180 180" className="h-14 w-14" aria-label="Next.js">
              <circle cx="90" cy="90" r="90" fill="#000" stroke="#fff" strokeWidth="4" />
              <path
                fill="#fff"
                d="M149.5 157.5 69 54H54v72h12V69l74 95.5a90 90 0 0 0 9.5-6.9ZM115 54h12v72h-12z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-white">
            Family Clinic Dashboard <span className="text-[#9CC9FF]">&amp;</span> Next.js Dashboard
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <Link
          href="/clinic-login"
          className="flex items-center justify-between rounded-lg border border-[#5B7FFF]/30 bg-white px-4 py-3 text-sm font-medium text-[#1E2F66] hover:bg-[#5B7FFF]/10"
        >
          <span className="flex items-center gap-3">
            <ClinicMark className="h-8 w-8" />
            Sign in to Family Clinic
          </span>
          <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </main>
  );
}

