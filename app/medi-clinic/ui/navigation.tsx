'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BeakerIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  FolderOpenIcon,
  HeartIcon,
  HomeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  SunIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import type { ClinicRole } from '../lib/access';
import type { Key } from '@/app/lib/i18n';
import { useT } from '@/app/ui/i18n-provider';

type Icon = typeof HomeIcon;
type NavLink = { href: string; label: Key; icon: Icon };

const overview: NavLink = { href: '/medi-clinic', label: 'nav.overview', icon: HomeIcon };
const patients: NavLink = { href: '/medi-clinic/patients', label: 'nav.patients', icon: UsersIcon };
const appointments: NavLink = {
  href: '/medi-clinic/appointments',
  label: 'nav.appointments',
  icon: CalendarDaysIcon,
};
const calendar: NavLink = {
  href: '/medi-clinic/calendar',
  label: 'nav.calendar',
  icon: CalendarIcon,
};
const claims: NavLink = {
  href: '/medi-clinic/claims',
  label: 'nav.claims',
  icon: ShieldCheckIcon,
};
const members: NavLink = {
  href: '/medi-clinic/members',
  label: 'nav.members',
  icon: IdentificationIcon,
};
const tomorrow: NavLink = { href: '/medi-clinic/tomorrow', label: 'nav.tomorrow', icon: SunIcon };
const shifts: NavLink = { href: '/medi-clinic/shifts', label: 'nav.shifts', icon: ClockIcon };
const clinical: NavLink = {
  href: '/medi-clinic/clinical',
  label: 'nav.clinical',
  icon: ClipboardDocumentCheckIcon,
};
const documents: NavLink = {
  href: '/medi-clinic/documents',
  label: 'nav.documents',
  icon: FolderOpenIcon,
};
const pharmacy: NavLink = { href: '/medi-clinic/pharmacy', label: 'nav.pharmacy', icon: BeakerIcon };
const payments: NavLink = { href: '/medi-clinic/payments', label: 'nav.payments', icon: BanknotesIcon };
const enquiries: NavLink = {
  href: '/medi-clinic/enquiries',
  label: 'nav.enquiries',
  icon: ChatBubbleLeftRightIcon,
};

const linksByRole: Record<ClinicRole, NavLink[]> = {
  patient: [{ href: '/medi-clinic/portal', label: 'nav.myClinic', icon: UserCircleIcon }],
  owner: [
    overview,
    patients,
    appointments,
    calendar,
    tomorrow,
    { href: '/medi-clinic/providers', label: 'nav.providers', icon: UserGroupIcon },
    shifts,
    { href: '/medi-clinic/treatments', label: 'nav.treatments', icon: HeartIcon },
    clinical,
    documents,
    pharmacy,
    payments,
    members,
    claims,
    enquiries,
  ],
  admin: [
    overview,
    patients,
    appointments,
    calendar,
    tomorrow,
    { href: '/medi-clinic/providers', label: 'nav.providersShort', icon: UserGroupIcon },
    shifts,
    clinical,
    documents,
    pharmacy,
    payments,
    members,
    claims,
    enquiries,
  ],
  front_desk: [overview, patients, appointments, calendar, tomorrow, shifts, documents, enquiries, payments, claims],
  doctor: [
    overview,
    { ...appointments, label: 'nav.myAppointments' },
    calendar,
    { ...shifts, label: 'nav.myShifts' },
    { ...patients, label: 'nav.myPatients' },
    clinical,
  ],
  pharmacist: [pharmacy],
  stock_manager: [{ ...pharmacy, label: 'nav.inventory', icon: ArchiveBoxIcon }],
};

export default function ClinicNavigation({ role }: { role: ClinicRole }) {
  const pathname = usePathname();
  const t = useT();
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
            {t(link.label)}
          </Link>
        );
      })}
    </nav>
  );
}
