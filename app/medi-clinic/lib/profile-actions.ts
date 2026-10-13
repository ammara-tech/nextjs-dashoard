'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireClinicRole } from './access';

export type ProfileState = { message?: string; success?: boolean };

const Schema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name.').max(80, 'Keep your name under 80 characters.'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^[0-9+()\- ]{5,30}$/, 'Enter a valid phone number.'),
  email: z
    .string()
    .trim()
    .regex(/^$|^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address.'),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth.'),
});

/** A patient edits their own contact details. The database only lets them change their own row. */
export async function updateMyProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { supabase } = await requireClinicRole(['patient']);
  const parsed = Schema.safeParse({
    full_name: formData.get('full_name') ?? '',
    phone: formData.get('phone') ?? '',
    email: formData.get('email') ?? '',
    date_of_birth: formData.get('date_of_birth') ?? '',
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? 'Check your details.' };
  }

  const { error } = await supabase.rpc('update_my_profile', {
    p_full_name: parsed.data.full_name,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email,
    p_date_of_birth: parsed.data.date_of_birth || null,
  });
  if (error) {
    console.error('Profile update error:', error);
    if (error.code === 'PGRST202' || error.code === '42883') {
      return {
        message: 'Profile editing is not set up yet. Ask the clinic to run supabase/clinic-patient-profile.sql.',
      };
    }
    return { message: error.code === 'P0001' ? error.message : 'Unable to save your profile.' };
  }
  revalidatePath('/medi-clinic/portal');
  revalidatePath('/medi-clinic', 'layout');
  return { message: 'saved', success: true };
}
