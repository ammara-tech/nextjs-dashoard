import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PatientRegistrationForm from '../../clinic-register/registration-form';

export default async function PatientRegistrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error('Supabase patient registration session error:', error);
    throw new Error('Unable to verify the current session.');
  }
  if (user) {
    redirect('/medi-clinic');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <section className="w-full max-w-[440px] rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#74809a]">Family Clinic</p>
        <h1 className="mt-1 text-2xl font-bold text-[#20263b]">
          Create a patient account
        </h1>
        <p className="mb-6 mt-2 text-sm text-[#727a90]">
          After you register, clinic staff will review your request from their
          dashboard. Once approved, your account will be linked to your patient
          record.
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
