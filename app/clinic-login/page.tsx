import LoginForm from '@/app/ui/login-form';
import Link from 'next/link';
import { Suspense } from 'react';

export default function ClinicLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
      <div className="w-full max-w-[440px] p-5">
        <div className="mb-5 rounded-2xl bg-[#263351] p-6 text-white">
          <p className="text-sm font-medium text-blue-200">Family Clinic</p>
          <h1 className="mt-1 text-2xl font-bold">Practice dashboard</h1>
        </div>
        <Suspense>
          <LoginForm
            defaultRedirect="/medi-clinic"
            title="Sign in to the Family Clinic dashboard."
          />
        </Suspense>
        <p className="mt-4 text-center text-sm text-[#727a90]">
          New patient?{' '}
          <Link
            className="font-semibold text-[#6077ed] hover:text-[#465fd4]"
            href="/clinic-register"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
