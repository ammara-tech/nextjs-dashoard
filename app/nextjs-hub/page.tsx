import Link from 'next/link';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { ClinicMark } from '@/app/ui/clinic-logo';
import { lusitana } from '@/app/ui/fonts';

function NextMark({ className = 'h-14 w-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-label="Next.js">
      <circle cx="90" cy="90" r="90" fill="#000" stroke="#fff" strokeWidth="4" />
      <path
        fill="#fff"
        d="M149.5 157.5 69 54H54v72h12V69l74 95.5a90 90 0 0 0 9.5-6.9ZM115 54h12v72h-12z"
      />
    </svg>
  );
}

export default function NextjsHubPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <ClinicMark className="h-10 w-10" />
          <span className="h-8 w-px bg-slate-300" aria-hidden />
          <NextMark className="h-10 w-10" />
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5B7FFF]">
              Next.js
            </p>
            <p className="text-lg font-bold text-[#1E2F66]">Dashboard</p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Sign in <ArrowRightIcon className="w-4" />
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <span className="flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E2F66]">
            <ShieldCheckIcon className="w-4" /> Account-protected workspace
          </span>
          <h1
            className={`${lusitana.className} text-5xl font-bold leading-tight text-slate-900 md:text-6xl`}
          >
            Welcome to your
            <span className="block text-[#5B7FFF]">Next.js dashboard.</span>
          </h1>
          <p className="max-w-md text-lg text-slate-600">
            Sign in to continue to your invoices, customers and revenue
            overview.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-[#1E2F66] px-6 py-3 font-medium text-white transition hover:bg-[#2b4190]"
          >
            Sign in to continue <ArrowRightIcon className="w-5" />
          </Link>
          <p className="text-sm text-slate-500">
            Looking for the clinic?{' '}
            <Link href="/clinic-hub" className="text-[#5B7FFF] underline">
              Go to the Family Clinic portal
            </Link>
          </p>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-[#DCE5FF] to-[#EEF2FF] p-5">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <NextMark />
            <h2
              className={`${lusitana.className} mt-8 text-2xl font-bold text-slate-900`}
            >
              Everything in one place.
            </h2>
            <div className="mt-6 space-y-3">
              {[
                [DocumentDuplicateIcon, 'Invoices', 'Latest invoices and statuses'],
                [UserGroupIcon, 'Customers', 'Customer list and totals'],
                [ChartBarIcon, 'Revenue', 'Monthly revenue overview'],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof BanknotesIcon;
                return (
                  <div
                    key={title as string}
                    className="flex items-center gap-4 rounded-xl bg-slate-50 p-4"
                  >
                    <I className="w-6 text-[#5B7FFF]" />
                    <div>
                      <p className="font-semibold text-slate-900">{title as string}</p>
                      <p className="text-sm text-slate-500">{text as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
