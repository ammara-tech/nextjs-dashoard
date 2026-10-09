import Link from 'next/link';
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import ClinicLogo, { ClinicMark } from '@/app/ui/clinic-logo';
import { lusitana } from '@/app/ui/fonts';

export default function ClinicHubPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <ClinicLogo />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:block"
          >
            Next.js dashboard
          </Link>
          <Link
            href="/clinic-login?callbackUrl=%2Fmedi-clinic"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Sign in <ArrowRightIcon className="w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <span className="flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E2F66]">
            <ShieldCheckIcon className="w-4" /> A dedicated workspace for every
            role
          </span>
          <h1
            className={`${lusitana.className} text-5xl font-bold leading-tight text-slate-900 md:text-6xl`}
          >
            Welcome to your
            <span className="block text-[#5B7FFF]">Family Clinic portal.</span>
          </h1>
          <p className="max-w-md text-lg text-slate-600">
            Sign in to continue to the workspace assigned to your account.
            Access is based on your clinic role.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/clinic-login?callbackUrl=%2Fmedi-clinic"
              className="flex items-center gap-2 rounded-lg bg-[#1E2F66] px-6 py-3 font-medium text-white transition hover:bg-[#2b4190]"
            >
              Sign in to continue <ArrowRightIcon className="w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Next.js dashboard <ArrowRightIcon className="w-5" />
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            Use the account credentials provided by your clinic.{' '}
            <Link href="/clinic-register" className="text-[#5B7FFF] underline">
              New patient? Create an account
            </Link>
          </p>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-[#DCE5FF] to-[#EEF2FF] p-5">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <ClinicMark className="h-14 w-14" />
            <h2
              className={`${lusitana.className} mt-8 text-2xl font-bold text-slate-900`}
            >
              One sign-in. The right workspace.
            </h2>
            <p className="mt-3 text-slate-600">
              Your account role determines which areas of the clinic portal you
              can access.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <UserGroupIcon className="w-6 text-[#5B7FFF]" />
                <div>
                  <p className="font-semibold text-slate-900">
                    Role-based access
                  </p>
                  <p className="text-sm text-slate-500">
                    Patient, clinical, pharmacy, and admin areas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <ShieldCheckIcon className="w-6 text-[#5B7FFF]" />
                <div>
                  <p className="font-semibold text-slate-900">
                    Account-protected pages
                  </p>
                  <p className="text-sm text-slate-500">
                    Sign in to access your permitted workspace
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

