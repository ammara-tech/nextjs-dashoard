'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ClinicRole } from '../lib/access';

const links = [
  { href: '/medi-clinic', label: 'Overview' },
  { href: '/medi-clinic/patients', label: 'Patients' },
  { href: '/medi-clinic/appointments', label: 'Appointments' },
  { href: '/medi-clinic/tomorrow', label: 'Tomorrow' },
];

export default function ClinicNavigation({
  role,
}: {
  role: ClinicRole;
}) {
  const pathname = usePathname();
  const visibleLinks =
    role === 'patient'
      ? [{ href: '/medi-clinic/portal', label: 'My clinic' }]
      : role === 'owner'
        ? [
            ...links,
            { href: '/medi-clinic/patient-access', label: 'Patient access' },
            { href: '/medi-clinic/providers', label: 'Providers & availability' },
            { href: '/medi-clinic/treatments', label: 'Treatments' },
            { href: '/medi-clinic/clinical', label: 'Clinical' },
            { href: '/medi-clinic/documents', label: 'Documents' },
            { href: '/medi-clinic/pharmacy', label: 'Pharmacy' },
            { href: '/medi-clinic/payments', label: 'Payments' },
            { href: '/medi-clinic/enquiries', label: 'Enquiries' },
          ]
      : role === 'doctor'
        ? [
            { href: '/medi-clinic', label: 'Overview' },
            { href: '/medi-clinic/appointments', label: 'My appointments' },
            { href: '/medi-clinic/patients', label: 'My patients' },
            { href: '/medi-clinic/clinical', label: 'Clinical' },
          ]
        : role === 'pharmacist'
          ? [{ href: '/medi-clinic/pharmacy', label: 'Pharmacy' }]
          : role === 'stock_manager'
            ? [{ href: '/medi-clinic/pharmacy', label: 'Inventory' }]
            : role === 'admin'
              ? [
                  ...links,
                  { href: '/medi-clinic/patient-access', label: 'Patient access' },
                  { href: '/medi-clinic/providers', label: 'Providers' },
                  { href: '/medi-clinic/clinical', label: 'Clinical' },
                  { href: '/medi-clinic/documents', label: 'Documents' },
                  { href: '/medi-clinic/pharmacy', label: 'Pharmacy' },
                  { href: '/medi-clinic/payments', label: 'Payments' },
                  { href: '/medi-clinic/enquiries', label: 'Enquiries' },
                ]
              : role === 'front_desk'
                ? [
                    ...links,
                    { href: '/medi-clinic/documents', label: 'Documents' },
                    { href: '/medi-clinic/enquiries', label: 'Enquiries' },
                    { href: '/medi-clinic/payments', label: 'Payments' },
                  ]
                : [];

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
