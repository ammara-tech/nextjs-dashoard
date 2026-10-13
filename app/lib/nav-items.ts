import type { Key } from './i18n';

export type NavItem = { href: string; key: Key };

const overview: NavItem = { href: '/medi-clinic', key: 'nav.overview' };
const patients: NavItem = { href: '/medi-clinic/patients', key: 'nav.patients' };
const appointments: NavItem = { href: '/medi-clinic/appointments', key: 'nav.appointments' };
const calendar: NavItem = { href: '/medi-clinic/calendar', key: 'nav.calendar' };
const tomorrow: NavItem = { href: '/medi-clinic/tomorrow', key: 'nav.tomorrow' };
const providers: NavItem = { href: '/medi-clinic/providers', key: 'nav.providersShort' };
const shifts: NavItem = { href: '/medi-clinic/shifts', key: 'nav.shifts' };
const treatments: NavItem = { href: '/medi-clinic/treatments', key: 'nav.treatments' };
const clinical: NavItem = { href: '/medi-clinic/clinical', key: 'nav.clinical' };
const documents: NavItem = { href: '/medi-clinic/documents', key: 'nav.documents' };
const pharmacy: NavItem = { href: '/medi-clinic/pharmacy', key: 'nav.pharmacy' };
const payments: NavItem = { href: '/medi-clinic/payments', key: 'nav.payments' };
const enquiries: NavItem = { href: '/medi-clinic/enquiries', key: 'nav.enquiries' };
const claims: NavItem = { href: '/medi-clinic/claims', key: 'nav.claims' };

export const navItemsByRole: Record<string, NavItem[]> = {
  patient: [
    { href: '/medi-clinic/portal', key: 'nav.myClinic' },
    { href: '/medical-aid/dashboard', key: 'plan.progress' },
  ],
  owner: [overview, patients, appointments, calendar, tomorrow, providers, shifts, treatments, clinical, documents, pharmacy, payments, claims, enquiries],
  admin: [overview, patients, appointments, calendar, tomorrow, providers, shifts, clinical, documents, pharmacy, payments, claims, enquiries],
  front_desk: [overview, patients, appointments, calendar, tomorrow, shifts, documents, enquiries, payments, claims],
  doctor: [
    overview,
    { ...appointments, key: 'nav.myAppointments' },
    calendar,
    { ...shifts, key: 'nav.myShifts' },
    { ...patients, key: 'nav.myPatients' },
    clinical,
  ],
  pharmacist: [pharmacy],
  stock_manager: [{ ...pharmacy, key: 'nav.inventory' }],
};

export const publicItems: { href: string; label: { en: string; af: string } }[] = [
  { href: '/', label: { en: 'Home', af: 'Tuis' } },
  { href: '/clinic-hub', label: { en: 'Family Clinic', af: 'Familiekliniek' } },
  { href: '/medical-aid', label: { en: 'Medical Aid', af: 'Mediese Fonds' } },
  { href: '/nextjs-hub', label: { en: 'Next.js dashboard', af: 'Next.js-paneel' } },
];

