import { redirect } from 'next/navigation';
import { getClinicAccess, redirectToClinicSignIn } from '../lib/access';

export default async function AdminDashboardEntryPage() {
  const { role } = await getClinicAccess();
  if (!['owner', 'admin', 'front_desk'].includes(role)) {
    redirectToClinicSignIn('/medi-clinic/dashboard');
  }
  redirect('/medi-clinic');
}
