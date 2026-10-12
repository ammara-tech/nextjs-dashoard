'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  FolderOpenIcon,
  HeartIcon,
  HomeIcon,
  SunIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import type { ClinicRole } from '../lib/access';

type Icon = typeof HomeIcon;
type NavLink = { href: string; label: string; icon: Icon };

const overview: NavLink = { href: '/medi-clinic', label: 'Overview', icon: HomeIcon };
const patients: NavLink = { href: '/medi-clinic/patients', label: 'Patients', icon: UsersIcon };
const appointments: NavLink = {
  href: '/medi-clinic/appointments',
  label: 'Appointments',
  icon: CalendarDaysIcon,
};
const tomorrow: NavLink = { href: '/medi-clinic/tomorrow', label: 'Tomorrow', icon: SunIcon };
const shifts: NavLink = { href: '/medi-clinic/shifts', label: 'Shifts', icon: ClockIcon };
const clinical: NavLink = {
  href: '/medi-clinic/clinical',
  label: 'Clinical',
  icon: ClipboardDocumentCheckIcon,
};
const documents: NavLink = {
  href: '/medi-clinic/documents',
  label: 'Documents',
  icon: FolderOpenIcon,
};
const pharmacy: NavLink = { href: '/medi-clinic/pharmacy', label: 'Pharmacy', icon: BeakerIcon };
const payments: NavLink = { href: '/medi-clinic/payments', label: 'Payments', icon: BanknotesIcon };
const enquiries: NavLink = {
  href: '/medi-clinic/enquiries',
  label: 'Enquiries',
  icon: ChatBubbleLeftRightIcon,
};

const linksByRole: Record<ClinicRole, NavLink[]> = {
  patient: [{ href: '/medi-clinic/portal', label: 'My clinic', icon: UserCircleIcon }],
  owner: [
    overview,
    patients,
    appointments,
    tomorrow,
    { href: '/medi-clinic/providers', label: 'Providers & availability', icon: UserGroupIcon },
    shifts,
    { href: '/medi-clinic/treatments', label: 'Treatments', icon: HeartIcon },
    clinical,
    documents,
    pharmacy,
    payments,
    enquiries,
  ],
  admin: [
    overview,
    patients,
    appointments,
    tomorrow,
    { href: '/medi-clinic/providers', label: 'Providers', icon: UserGroupIcon },
    shifts,
    clinical,
    documents,
    pharmacy,
    payments,
    enquiries,
  ],
  front_desk: [overview, patients, appointments, tomorrow, shifts, documents, enquiries, payments],
  doctor: [
    overview,
    { ...appointments, label: 'My appointments' },
    { ...shifts, label: 'My shifts' },
    { ...patients, label: 'My patients' },
    clinical,
  ],
  pharmacist: [pharmacy],
  stock_manager: [{ ...pharmacy, label: 'Inventory', icon: ArchiveBoxIcon }],
};

export default function ClinicNavigation({ role }: { role: ClinicRole }) {
  const pathname = usePathname();
  const visibleLinks = linksByRole[role] ?? [];

  return (
    <nav
      aria-label="Clinic dashboard"
      className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e9eaf0] bg-white p-1.5 shadow-sm"
    >
      {visibleLinks.map((link) => {
        const active =
          link.href === '/medi-clinic'
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-[#1E2F66] text-white'
                : 'text-[#727a90] hover:bg-[#EEF2FF] hover:text-[#1E2F66]'
            }`}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
