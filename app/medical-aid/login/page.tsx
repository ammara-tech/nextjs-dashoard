import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from '@/app/ui/login-form';
import ClinicLogo from '@/app/ui/clinic-logo';

export const metadata = { title: 'Sign in · Care Plans' };

export default async function MedicalAidLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const registerHref = callbackUrl
    ? `/medical-aid/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/medical-aid/register';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-[440px] p-5">
        <div className="mb-5 rounded-2xl bg-[#0F172A] p-6 text-white">
          <ClinicLogo light />
          <h1 className="mt-4 text-2xl font-bold">Care Plans</h1>
        </div>
        <Suspense>
          <LoginForm
            defaultRedirect="/medical-aid/dashboard"
            title="Sign in to your Care Plans."
          />
        </Suspense>
        <p className="mt-4 text-center text-sm text-[#727a90]">
          New here?{' '}
          <Link
            className="font-semibold text-[#5B7FFF] hover:text-[#465fd4]"
            href={registerHref}
          >
            Create a user
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[#727a90]">
          <Link className="hover:text-[#1E2F66]" href="/medical-aid">
            Back to Care Plans
          </Link>
        </p>
      </div>
    </main>
  );
}
