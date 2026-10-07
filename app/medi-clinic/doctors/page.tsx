import { redirect } from 'next/navigation';
import { getClinicAccess, redirectToClinicSignIn } from '../lib/access';

export default async function DoctorsEntryPage() {
  const { role } = await getClinicAccess();
  if (role !== 'doctor') {
    redirectToClinicSignIn('/medi-clinic/doctors');
  }
  redirect('/medi-clinic/clinical');
}
