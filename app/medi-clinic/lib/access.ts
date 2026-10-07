import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ClinicRole =
  | 'owner'
  | 'front_desk'
  | 'doctor'
  | 'pharmacist'
  | 'stock_manager'
  | 'admin'
  | 'patient';

const clinicRoles = new Set<ClinicRole>([
  'owner',
  'front_desk',
  'doctor',
  'pharmacist',
  'stock_manager',
  'admin',
  'patient',
]);

export async function getClinicAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Supabase clinic session error:', error);
    throw new Error('Unable to verify your clinic access.');
  }

  if (!user) {
    redirect('/clinic-login?callbackUrl=%2Fmedi-clinic');
  }

  const claimedRole = user.app_metadata.clinic_role;
  const role =
    typeof claimedRole === 'string' && clinicRoles.has(claimedRole as ClinicRole)
      ? (claimedRole as ClinicRole)
      : claimedRole === undefined
        ? 'front_desk'
        : null;

  if (!role) {
    throw new Error('Your account does not have a valid clinic role.');
  }

  return {
    supabase,
    user,
    role,
    isOwner: role === 'owner',
    canManageAppointments:
      role === 'owner' || role === 'admin' || role === 'front_desk',
    canViewPatients:
      role === 'owner' || role === 'front_desk' || role === 'doctor',
  };
}

export async function requireClinicOwner() {
  const access = await getClinicAccess();
  if (!access.isOwner) {
    throw new Error('Only the clinic owner can manage treatments or delete records.');
  }
  return access;
}

export async function requireClinicStaff() {
  const access = await getClinicAccess();
  if (!access.canManageAppointments) {
    throw new Error('Your clinic role cannot manage patient or appointment records.');
  }
  return access;
}

export async function requireClinicRole(roles: ClinicRole[]) {
  const access = await getClinicAccess();
  if (!roles.includes(access.role)) {
    throw new Error('Your clinic role does not have access to this page.');
  }
  return access;
}

export function redirectToClinicSignIn(callbackUrl: string): never {
  const query = new URLSearchParams({
    callbackUrl,
  });
  redirect(`/clinic-login?${query.toString()}`);
}
