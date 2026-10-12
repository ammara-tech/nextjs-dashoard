import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { ClinicMark } from '@/app/ui/clinic-logo';
import { lusitana } from '@/app/ui/fonts';

export const metadata = { title: 'Page not found' };

const places = [
  { href: '/clinic-hub', label: 'Family Clinic' },
  { href: '/medical-aid', label: 'Medical Aid' },
  { href: '/nextjs-hub', label: 'Next.js dashboard' },
];

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
      <ClinicMark className="h-16 w-16" />
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-[#5B7FFF]">
        Error 404
      </p>
      <h1
        className={`${lusitana.className} mt-2 text-4xl font-bold text-[#0F172A] md:text-5xl`}
      >
        We could not find that page.
      </h1>
      <p className="mt-3 max-w-md text-[#475569]">
        The link may be old or mistyped. Choose a dashboard to carry on.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {places.map((place) => (
          <Link
            className="flex items-center gap-2 rounded-xl border border-[#dbe3ff] bg-white px-5 py-3 text-sm font-medium text-[#1E2F66] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            href={place.href}
            key={place.href}
          >
            {place.label}
            <ArrowRightIcon className="w-4" />
          </Link>
        ))}
        <Link
          className="rounded-xl bg-gradient-to-r from-[#1E4FD8] to-[#5B7FFF] px-5 py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
