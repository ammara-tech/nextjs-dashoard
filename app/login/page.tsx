import Link from 'next/link';
import { ClinicMark } from '@/app/ui/clinic-logo';
import AcmeLogo from '@/app/ui/acme-logo';
import LoginForm from '@/app/ui/login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-[#1E2F66] p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <AcmeLogo />
          </div>
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

