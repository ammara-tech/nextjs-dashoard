'use server';

import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireClinicRole } from './access';

const ProfileSchema = z.object({
  provider_id: z.string().uuid('Select a medical aid provider.'),
  plan: z.string().trim().min(1).max(120),
  member_id: z.string().trim().min(3, 'Enter your member ID.').max(40),
  membership_number: z.string().trim().max(40).optional(),
  dependent_label: z.string().trim().min(1).max(60),
});

function encryptionKey() {
  const secret = process.env.MEDICAL_AID_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('Medical aid encryption is not configured.');
  }
  return createHash('sha256').update(secret).digest();
}

// AES-256-GCM; output is iv.tag.ciphertext (base64).
function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

export async function saveMedicalAidProfile(formData: FormData) {
  const { supabase, user } = await requireClinicRole(['patient']);
  const parsed = ProfileSchema.safeParse({
    provider_id: formData.get('provider_id'),
    plan: formData.get('plan'),
    member_id: formData.get('member_id'),
    membership_number: formData.get('membership_number') || undefined,
    dependent_label: formData.get('dependent_label'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid details.');
  }
  const input = parsed.data;

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (patientError || !patient) {
    throw new Error('Your patient account is not linked.');
  }

  let cardPath: string | null = null;
  const file = formData.get('card');
  if (file instanceof File && file.size > 0) {
    if (
      !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      throw new Error('Upload a PDF, JPEG or PNG card up to 10 MB.');
    }
    cardPath = `pt_${patient.id}/medical_cards/${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage
      .from('patients-medical-records')
      .upload(cardPath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error('Medical card upload error:', uploadError);
      throw new Error('Unable to upload your medical aid card.');
    }
  }

  const row: Record<string, unknown> = {
    patient_id: patient.id,
    dependent_label: input.dependent_label,
    provider_id: input.provider_id,
    plan: input.plan,
    member_id_encrypted: encrypt(input.member_id),
    member_id_last4: input.member_id.slice(-4),
    membership_number_encrypted: input.membership_number
      ? encrypt(input.membership_number)
      : null,
    // Switch verification is not integrated: every save awaits clinic review.
    status: 'pending',
    verified_at: null,
    updated_at: new Date().toISOString(),
  };
  if (cardPath) row.card_object_path = cardPath;

  const { error } = await supabase
    .from('patient_insurance_profiles')
    .upsert(row, { onConflict: 'patient_id,dependent_label' });
  if (error) {
    console.error('Medical aid profile save error:', error);
    throw new Error(`Unable to save medical aid details (${error.code}).`);
  }
  revalidatePath('/medi-clinic/portal');
}
