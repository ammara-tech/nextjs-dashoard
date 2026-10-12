import {
  ArrowRightIcon,
  HeartIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { ClinicMark, MedicalAidMark } from '@/app/ui/clinic-logo';

const cards = [
  {
    href: '/clinic-hub',
    badge: 'Family Clinic',
    title: 'Care for the whole family, in one place.',
    text: 'Appointments, prescriptions, medical aid and records for patients and clinic staff.',
    cta: 'Open Family Clinic',
    icon: HeartIcon,
    accent: 'from-[#1E4FD8] to-[#5B7FFF]',
  },
  {
    href: '/nextjs-hub',
    badge: 'Next.js',
    title: 'Next.js invoice dashboard',
    text: 'Manage customers, invoices and revenue in the original Next.js dashboard.',
    cta: 'Open Next.js dashboard',
    icon: Squares2X2Icon,
    accent: 'from-[#0F172A] to-[#1E2F66]',
  },
  {
    href: '/medical-aid',
    badge: 'Medical Aid',
    title: 'Medical aid dashboard',
    text: 'Join a Family Clinic Care Plan, choose the card it is paid from, and see your cover and documents.',
    cta: 'Open Medical Aid',
    icon: ShieldCheckIcon,
    accent: 'from-[#0D9488] to-[#2DD4BF]',
  },
];

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
          <span className="h-10 w-px bg-white/25" aria-hidden="true" />
          <MedicalAidMark className="h-16 w-16" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg font-semibold md:text-2xl">
          <span>Family Clinic Dashboard</span>
          <span className="text-[#9CC9FF]" aria-hidden="true">&amp;</span>
          <span>Next.js Dashboard</span>
          <span className="text-[#9CC9FF]" aria-hidden="true">&amp;</span>
          <span>Medical Aid Dashboard</span>
        </div>
      </div>
      <div className="mt-4 grid grow content-center gap-6 md:grid-cols-3 md:px-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-[#e3e8f5] bg-gradient-to-b from-white to-[#F3F6FF] px-8 pb-8 pt-10 text-center shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#5B7FFF]/15"
              href={card.href}
              key={card.href}
            >
              <span
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`}
                aria-hidden="true"
              />
              <span
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg ring-4 ring-white`}
              >
                <Icon className="h-8 w-8" />
              </span>
              <span className="mx-auto rounded-full border border-[#dbe3ff] bg-[#EEF2FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1E2F66]">
                {card.badge}
              </span>
              <h2 className="text-3xl font-bold text-[#0F172A]">{card.title}</h2>
              <p className="text-[#475569]">{card.text}</p>
              <span
                className={`mt-auto flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r ${card.accent} px-6 py-3 font-medium text-white shadow-md transition-all group-hover:gap-4 group-hover:shadow-lg`}
              >
                {card.cta}
                <ArrowRightIcon className="w-5" />
              </span>
            </Link>
          );
        })}
      </div>
      <footer className="mt-8 flex flex-col items-center gap-3 text-center text-sm text-[#64748B]">
        <ul className="flex flex-wrap justify-center gap-2">
          {['Role-based access', 'Private documents', 'Demo payments only'].map((item) => (
            <li
              className="rounded-full border border-[#dbe3ff] bg-white px-3 py-1 text-xs font-medium text-[#1E2F66]"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
        <p>
          Demonstration system with sample data. Built by Ammara Badat with
          Next.js and Supabase.
        </p>
      </footer>
    </main>
  );
}
