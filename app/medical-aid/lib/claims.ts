import type { createClient } from '@/lib/supabase/server';
import type { Claim } from '@/app/lib/claims';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The signed-in patient's claims. `ready` is false until clinic-claims.sql has been run. */
export async function loadPatientClaims(
  supabase: Supabase,
  patientId: string,
): Promise<{ ready: boolean; claims: Claim[] }> {
  const { data, error } = await supabase
    .from('clinic_claims')
    .select(
      'id, patient_id, reference, description, amount_minor, status, decision_note, submitted_at, updated_at, paid_at',
    )
    .eq('patient_id', patientId)
    .order('submitted_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('Claims load error:', error);
    return { ready: false, claims: [] };
  }
  return { ready: true, claims: (data ?? []) as Claim[] };
}
