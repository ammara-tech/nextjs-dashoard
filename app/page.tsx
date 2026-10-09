import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { ClinicMark } from '@/app/ui/clinic-logo';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-[#F8FAFC] p-6">
      <div className="flex shrink-0 flex-col items-center gap-5 rounded-2xl bg-[#0F172A] px-6 py-10 text-center text-white">
        <div className="flex items-center gap-4">
          <ClinicMark className="h-16 w-16" />
          <span className="h-10 w-px bg-white/25" aria-hidden="true" />
          <svg viewBox="0 0 180 180" className="h-16 w-16 shrink-0" aria-hidden="true">
            <circle cx="90" cy="90" r="90" fill="#000" stroke="#fff" strokeWidth="4" />
            <path
              d="M149.5 157.5 69.1 54H54v72h12V69.4l73.8 95.2a90 90 0 0 0 9.7-7.1Z"
              fill="#fff"
            />
            <rect x="115" y="54" width="12" height="72" fill="#fff" />
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg font-semibold md:text-2xl">
          <span>Family Clinic Dashboard</span>
          <span className="text-[#9CC9FF]" aria-hidden="true">&amp;</span>
          <span>Next.js Dashboard</span>
        </div>
      </div>
      <div className="mt-4 grid grow content-center gap-6 md:grid-cols-2 md:px-8">
        <div className="flex flex-col gap-6 rounded-2xl bg-white px-8 py-10 text-center shadow-sm">
          <span className="mx-auto rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E2F66]">
            Family Clinic
          </span>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Care for the whole family, in one place.
          </h1>
          <p className="text-[#475569]">
            Appointments, prescriptions, medical aid and records for patients
            and clinic staff.
          </p>
          <Link
            href="/clinic-hub"
            className="mx-auto mt-auto flex items-center gap-3 rounded-xl bg-[#5B7FFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4a6be6]"
          >
            Open the Family Clinic dashboard
            <ArrowRightIcon className="w-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 rounded-2xl bg-white px-8 py-10 text-center shadow-sm">
          <span className="mx-auto rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E2F66]">
            Next.js
          </span>
          <h2 className="text-3xl font-bold text-[#0F172A]">
            Next.js invoice dashboard
          </h2>
          <p className="text-[#475569]">
            Manage customers, invoices and revenue in the original Next.js
            dashboard.
          </p>
          <Link
            href="/login"
            className="mx-auto mt-auto flex items-center gap-3 rounded-xl border border-[#1E2F66] px-6 py-3 font-medium text-[#1E2F66] transition-colors hover:bg-[#EEF2FF]"
          >
            Open the Next.js dashboard
            <ArrowRightIcon className="w-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
