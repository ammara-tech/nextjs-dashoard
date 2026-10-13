'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireClinicRole } from '@/app/medi-clinic/lib/access';

export type PlanActionState = { message?: string; success?: boolean };

const PlanSchema = z.object({
  plan_code: z.enum(['essential', 'family-plus', 'premium'], {
    message: 'Choose a plan.',
  }),
  card_id: z.string().uuid('Choose one of your saved cards.'),
});

function refresh() {
  revalidatePath('/medical-aid/dashboard');
  revalidatePath('/medi-clinic/portal');
}

// The database functions raise readable messages (code P0001) for things the
// person can fix, such as an expired card. Anything else is logged and shown
// as a generic message.
function readable(error: { code?: string; message: string }, fallback: string) {
  if (error.code === 'P0001') return error.message;
  if (error.code === 'PGRST202' || error.code === '42883') {
    return 'Care plans are not set up yet. Ask the clinic to run supabase/clinic-care-plans.sql.';
  }
  return `${fallback}${error.code ? ` (${error.code})` : ''}`;
}

export async function enrolInCarePlan(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const { supabase } = await requireClinicRole(['patient']);
  const parsed = PlanSchema.safeParse({
    plan_code: formData.get('plan_code'),
    card_id: formData.get('card_id'),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? 'Choose a plan and a card.' };
  }

  const { error } = await supabase.rpc('enrol_in_care_plan', {
    p_plan_code: parsed.data.plan_code,
    p_card_id: parsed.data.card_id,
  });
  if (error) {
    console.error('Care plan enrol error:', error);
    return { message: readable(error, 'Unable to join the plan.') };
  }
  refresh();
  redirect('/medical-aid/dashboard?tab=overview&joined=1');
}

export async function changeCarePlanCard(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const { supabase } = await requireClinicRole(['patient']);
  const cardId = z.string().uuid().safeParse(formData.get('card_id'));
  if (!cardId.success) return { message: 'Choose one of your saved cards.' };

  const { error } = await supabase.rpc('change_care_plan_card', {
    p_card_id: cardId.data,
  });
  if (error) {
    console.error('Care plan change card error:', error);
    return { message: readable(error, 'Unable to change the card.') };
  }
  refresh();
  return { message: 'Your plan will now be paid from this card.', success: true };
}

export async function cancelCarePlan(
  _previous: PlanActionState,
): Promise<PlanActionState> {
  const { supabase } = await requireClinicRole(['patient']);
  const { error } = await supabase.rpc('cancel_care_plan');
  if (error) {
    console.error('Care plan cancel error:', error);
    return { message: readable(error, 'Unable to cancel the plan.') };
  }
  refresh();
  redirect('/medical-aid/dashboard?tab=overview&cancelled=1');
}

export type ClaimActionState = { message?: string; success?: boolean };

const ClaimSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, 'Describe what the claim is for.')
    .max(200, 'Keep the description under 200 characters.'),
  amount: z.coerce
    .number({ message: 'Enter an amount.' })
    .gt(0, 'Enter an amount greater than zero.')
    .max(1_000_000, 'That amount is too large.'),
});

/** A patient submits a medical aid claim. The database sets the status and reference. */
export async function submitClaim(
  _previous: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const { supabase } = await requireClinicRole(['patient']);
  const parsed = ClaimSchema.safeParse({
    description: formData.get('description'),
    amount: formData.get('amount'),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? 'Check the claim details.' };
  }

  const { error } = await supabase.rpc('submit_claim', {
    p_description: parsed.data.description,
    p_amount_minor: Math.round(parsed.data.amount * 100),
  });
  if (error) {
    console.error('Claim submit error:', error);
    if (error.code === 'PGRST202' || error.code === '42883') {
      return {
        message: 'Claims are not set up yet. Ask the clinic to run supabase/clinic-claims.sql.',
      };
    }
    return { message: error.code === 'P0001' ? error.message : 'Unable to submit the claim.' };
  }
  revalidatePath('/medical-aid/dashboard');
  revalidatePath('/medi-clinic/claims');
  return { message: 'Your claim was submitted.', success: true };
}
