import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import ClinicLogo from '@/app/ui/clinic-logo';

export default function ClinicHubPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="bg-[#0F172A] p-5">
        <ClinicLogo light />
      </header>
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Family Clinic
        </span>
        <h1 className="text-4xl font-bold text-[#0F172A]">
          One sign-in. The right workspace.
        </h1>
        <p className="text-slate-600">
          Patients, doctors, front desk, pharmacy and administrators all sign
          in here and land in the workspace built for their role.
        </p>
        <Link
          href="/clinic-login?callbackUrl=%2Fmedi-clinic"
          className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
        >
          Sign in to continue <ArrowRightIcon className="w-5" />
        </Link>
        <Link
          href="/login?callbackUrl=%2Fdashboard"
          className="flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-800 transition hover:bg-slate-100"
        >
          Sign in to the Next.js dashboard <ArrowRightIcon className="w-5" />
        </Link>
        <Link href="/clinic-register" className="text-sm text-emerald-700 hover:underline">
          New patient? Create an account
        </Link>
      </section>
    </main>
  );
}
