import Link from 'next/link';
import { signOut } from '@/app/lib/actions';

export default function ClinicAccessUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#74809a]">Family Clinic</p>
        <h1 className="mt-1 text-2xl font-bold text-[#20263b]">
          Clinic access unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#727a90]">
          Your account does not have a clinic patient profile. New accounts
          receive access when registration is complete. If you already have an
          account, please contact clinic reception.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white"
            href="/clinic-register"
          >
            Create an account
          </Link>
          <Link
            className="rounded-xl border border-[#e3e5eb] px-4 py-2.5 text-sm font-semibold text-[#626b82]"
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
