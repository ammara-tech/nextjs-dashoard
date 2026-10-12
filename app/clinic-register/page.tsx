import Link from 'next/link';
import PatientRegistrationForm from './registration-form';
import HistoryNav from '@/app/ui/history-nav';

export default function PatientRegistrationPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <HistoryNav fallbackHref="/clinic-login" variant="floating" />
      <section className="w-full max-w-[440px] rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#74809a]">Family Clinic</p>
        <h1 className="mt-1 text-2xl font-bold text-[#20263b]">
          Create a patient account
        </h1>
        <p className="mb-6 mt-2 text-sm text-[#727a90]">
          Create an account to access your clinic portal.
        </p>
        <PatientRegistrationForm />
        <p className="mt-5 text-center text-sm text-[#727a90]">
          Already registered?{' '}
          <Link className="font-semibold text-[#6077ed]" href="/clinic-login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
