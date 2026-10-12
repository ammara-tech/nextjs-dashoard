import Link from 'next/link';
import PatientRegistrationForm from '@/app/clinic-register/registration-form';

export const metadata = { title: 'Create user · Care Plans' };

export default async function MedicalAidRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')
    ? callbackUrl
    : '/medical-aid/dashboard';
  const signInHref = callbackUrl
    ? `/medical-aid/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/medical-aid/login';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <section className="w-full max-w-[440px] rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#74809a]">Family Clinic Care Plans</p>
        <h1 className="mt-1 text-2xl font-bold text-[#20263b]">Create a user</h1>
        <p className="mb-6 mt-2 text-sm text-[#727a90]">
          This is the same account you use for the Family Clinic patient portal.
        </p>
        <PatientRegistrationForm redirectTo={redirectTo} />
        <p className="mt-5 text-center text-sm text-[#727a90]">
          Already registered?{' '}
          <Link className="font-semibold text-[#6077ed]" href={signInHref}>
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[#727a90]">
          <Link className="hover:text-[#0F766E]" href="/medical-aid">
            Back to Care Plans
          </Link>
        </p>
      </section>
    </main>
  );
}
