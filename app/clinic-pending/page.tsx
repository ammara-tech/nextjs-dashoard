import Link from 'next/link';
import { signOut } from '@/app/lib/actions';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ClinicPendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error('Supabase pending clinic access lookup error:', error);
    throw new Error('Unable to check your clinic access request.');
  }
  const denied = user?.app_metadata.clinic_access_status === 'denied';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#74809a]">Family Clinic</p>
        <h1 className="mt-1 text-2xl font-bold text-[#20263b]">
          {denied ? 'Access request was denied' : 'Waiting for clinic approval'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#727a90]">
          {denied
            ? 'Your account cannot access the patient portal. Please contact clinic reception if you believe this decision was made in error.'
            : 'Clinic staff must review and approve your patient access request before private clinic information is available. If your request was just approved, sign out and sign back in to refresh your access.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white"
            href="/clinic-login"
          >
            Sign in
          </Link>
          <form action={signOut}>
            <button
              className="rounded-xl border border-[#e3e5eb] px-4 py-2.5 text-sm font-semibold text-[#626b82]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
