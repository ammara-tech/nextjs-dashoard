import { redirect } from 'next/navigation';

export default function LegacyPatientsLayout() {
  redirect('/medi-clinic/patients');
}
