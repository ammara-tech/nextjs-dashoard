'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type RegistrationState = {
  message?: string;
  success?: boolean;
};

const RegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(160),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth.')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date <= new Date() && date.getUTCFullYear() >= 1900;
    }, 'Enter a valid date of birth in the past.'),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export async function registerPatient(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const parsed = RegistrationSchema.safeParse({
    fullName: formData.get('full_name'),
    phone: formData.get('phone'),
    dateOfBirth: formData.get('date_of_birth'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? 'Check the registration details.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        date_of_birth: parsed.data.dateOfBirth,
        family_clinic_patient_signup: true,
      },
    },
  });

  if (error) {
    console.error('Supabase patient registration error:', error);
    return {
      message: `Unable to create the patient account: ${error.message}`,
    };
  }

  if (data.session) {
    // The signup trigger sets the patient role just after the account is
    // created, so the very first token does not carry it yet. Refreshing the
    // session issues a new token that includes the role.
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Supabase session refresh error:', refreshError);
    }
    redirect('/medi-clinic');
  }

  return {
    message:
      'Account created. Check your email to confirm your address, then sign in to the clinic.',
    success: true,
  };
}
