'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isClaimStatus } from '@/app/lib/claims';
import { requireClinicRole } from './access';

const Schema = z.object({
  claim_id: z.string().uuid(),
  status: z.string().refine(isClaimStatus, 'Choose a claim stage.'),
  note: z.string().trim().max(200).optional(),
});

/** Moves a claim to its next stage. The database checks the move is allowed. */
export async function updateClaimStatus(formData: FormData): Promise<void> {
  const { supabase } = await requireClinicRole(['owner', 'admin', 'front_desk']);
  const parsed = Schema.safeParse({
    claim_id: formData.get('claim_id'),
    status: formData.get('status'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) {
    redirect(`/medi-clinic/claims?error=${encodeURIComponent('Check the claim and stage.')}`);
  }

  const { error } = await supabase.rpc('set_claim_status', {
    p_claim_id: parsed.data.claim_id,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
  });
  if (error) {
    console.error('Claim status error:', error);
    const message =
      error.code === 'P0001'
        ? error.message
        : error.code === 'PGRST202' || error.code === '42883'
          ? 'Claims are not set up yet. Run supabase/clinic-claims.sql.'
          : 'Unable to update the claim.';
    redirect(`/medi-clinic/claims?error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/medi-clinic/claims');
  revalidatePath('/medical-aid/dashboard');
  redirect('/medi-clinic/claims?updated=1');
}
