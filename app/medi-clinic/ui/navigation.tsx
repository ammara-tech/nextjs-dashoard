'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/medi-clinic', label: 'Overview' },
  { href: '/medi-clinic/patients', label: 'Patients' },
  { href: '/medi-clinic/appointments', label: 'Appointments' },
  { href: '/medi-clinic/tomorrow', label: 'Tomorrow' },
];

export default function ClinicNavigation({
  isOwner,
}: {
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const visibleLinks = isOwner
    ? [...links, { href: '/medi-clinic/treatments', label: 'Treatments' }]
    : links;

  return (
    <nav aria-label="Clinic dashboard" className="flex flex-wrap gap-2">
      {visibleLinks.map((link) => {
        const active =
          link.href === '/medi-clinic'
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-[#263351] text-white'
                : 'text-[#727a90] hover:bg-[#f0f2f7] hover:text-[#263351]'
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
