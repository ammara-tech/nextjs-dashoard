import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ClinicLogo from '@/app/ui/clinic-logo';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-[#F8FAFC] p-6">
      <div className="flex h-24 shrink-0 items-end rounded-2xl bg-[#0F172A] p-5 md:h-52">
        <ClinicLogo light />
      </div>
      <div className="mt-4 flex grow items-center justify-center">
        <div className="flex max-w-xl flex-col gap-6 rounded-2xl bg-white px-8 py-12 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Care for the whole family, in one place.
          </h1>
          <p className="text-[#475569]">
            Appointments, prescriptions, medical aid and records for patients
            and clinic staff.
          </p>
          <Link
            href="/clinic-hub"
            className="mx-auto flex items-center gap-3 rounded-xl bg-[#5B7FFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4a6be6]"
          >
            Open the Family Clinic dashboard
            <ArrowRightIcon className="w-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
