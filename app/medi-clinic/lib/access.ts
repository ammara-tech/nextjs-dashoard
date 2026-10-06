import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ClinicRole = 'owner' | 'front_desk';

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
    redirect('/login?callbackUrl=%2Fmedi-clinic');
  }

  const role: ClinicRole =
    user.app_metadata.clinic_role === 'owner' ? 'owner' : 'front_desk';

  return {
    supabase,
    user,
    role,
    isOwner: role === 'owner',
  };
}

export async function requireClinicOwner() {
  const access = await getClinicAccess();
  if (!access.isOwner) {
    throw new Error('Only the clinic owner can manage treatments or delete records.');
  }
  return access;
}
