import LoginForm from '@/app/ui/login-form';
import ClinicLogo from '@/app/ui/clinic-logo';
import Link from 'next/link';
import { Suspense } from 'react';

export default async function ClinicLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const hideRegister =
    callbackUrl?.startsWith('/medi-clinic/dashboard') ||
    callbackUrl?.startsWith('/medi-clinic/doctors');

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-[440px] p-5">
        <div className="mb-5 rounded-2xl bg-[#0F172A] p-6 text-white">
          <ClinicLogo light />
          <h1 className="mt-4 text-2xl font-bold">Practice dashboard</h1>
        </div>
        <Suspense>
          <LoginForm
            defaultRedirect="/medi-clinic"
            title="Sign in to the Family Clinic dashboard."
          />
        </Suspense>
        {hideRegister ? null : (
          <p className="mt-4 text-center text-sm text-[#727a90]">
            New patient?{' '}
            <Link
              className="font-semibold text-[#5B7FFF] hover:text-[#465fd4]"
              href="/clinic-register"
            >
              Create an account
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
