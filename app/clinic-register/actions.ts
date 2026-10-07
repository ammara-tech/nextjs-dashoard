'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type RegistrationState = {
  message?: string;
  success?: boolean;
};

const RegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(160),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export async function registerPatient(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const parsed = RegistrationSchema.safeParse({
    fullName: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? 'Check the registration details.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    console.error('Supabase patient registration error:', error);
    return {
      message:
        'Unable to create the account. Check the details or contact clinic reception.',
    };
  }

  return {
    message:
      'Account created. Check your email if verification is required, then contact clinic reception to verify and link your patient record before using the portal.',
    success: true,
  };
}
