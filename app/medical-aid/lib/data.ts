import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CarePlanMembership = {
  id: string;
  plan_code: string;
  status: 'active' | 'cancelled';
  started_at: string;
  next_debit_on: string | null;
  cancelled_at: string | null;
  card_id: string | null;
};

export type CarePlanPayment = {
  id: string;
  plan_code: string;
  amount_minor: number;
  currency: string;
  card_brand: string | null;
  card_last4: string | null;
  status: 'paid' | 'failed' | 'refunded';
  is_demo: boolean;
  reference: string;
  period_start: string;
  period_end: string;
  created_at: string;
};

export type CarePlanState = {
  /** False when the care plan tables are missing (migration not run yet). */
  ready: boolean;
  /** The plan the patient is on now, if any. */
  active: CarePlanMembership | null;
  /** The most recent plan, active or cancelled, used to keep showing documents. */
  latest: CarePlanMembership | null;
  payments: CarePlanPayment[];
};

export async function loadCarePlanState(
  supabase: Supabase,
  patientId: string,
): Promise<CarePlanState> {
  const [membershipsResult, paymentsResult] = await Promise.all([
    supabase
      .from('clinic_care_plan_memberships')
      .select('id, plan_code, status, started_at, next_debit_on, cancelled_at, card_id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('clinic_care_plan_payments')
      .select(
        'id, plan_code, amount_minor, currency, card_brand, card_last4, status, is_demo, reference, period_start, period_end, created_at',
      )
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (membershipsResult.error || paymentsResult.error) {
    console.error(
      'Care plan load error:',
      membershipsResult.error ?? paymentsResult.error,
    );
    return { ready: false, active: null, latest: null, payments: [] };
  }

  const memberships = (membershipsResult.data ?? []) as CarePlanMembership[];
  return {
    ready: true,
    active: memberships.find((membership) => membership.status === 'active') ?? null,
    latest: memberships[0] ?? null,
    payments: (paymentsResult.data ?? []) as CarePlanPayment[],
  };
}
