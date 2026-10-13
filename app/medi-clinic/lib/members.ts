import 'server-only';

import { getCarePlan } from '@/app/lib/care-plans';
import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Member = {
  id: string;
  patientName: string;
  patientNumber: string | null;
  phone: string | null;
  planCode: string;
  planName: string;
  priceMinor: number;
  status: 'active' | 'cancelled';
  startedAt: string;
  nextDebitOn: string | null;
  cancelledAt: string | null;
  paymentsMade: number;
  totalPaidMinor: number;
  lastPaymentAt: string | null;
};

/**
 * Every Care Plan membership in the clinic with what each member has paid.
 * `ready` is false until clinic-care-plans.sql has been run.
 */
export async function loadMembers(
  supabase: Supabase,
): Promise<{ ready: boolean; members: Member[] }> {
  const [membershipsResult, paymentsResult] = await Promise.all([
    supabase
      .from('clinic_care_plan_memberships')
      .select(
        'id, patient_id, plan_code, status, started_at, next_debit_on, cancelled_at, patients(full_name, patient_number, phone)',
      )
      .order('started_at', { ascending: false })
      .limit(500),
    supabase
      .from('clinic_care_plan_payments')
      .select('membership_id, amount_minor, status, created_at')
      .limit(5000),
  ]);
  if (membershipsResult.error || paymentsResult.error) {
    console.error('Members load error:', membershipsResult.error ?? paymentsResult.error);
    return { ready: false, members: [] };
  }

  const paid = new Map<string, { count: number; total: number; last: string | null }>();
  for (const payment of paymentsResult.data ?? []) {
    if (payment.status !== 'paid') continue;
    const entry = paid.get(payment.membership_id) ?? { count: 0, total: 0, last: null };
    entry.count += 1;
    entry.total += payment.amount_minor;
    if (!entry.last || payment.created_at > entry.last) entry.last = payment.created_at;
    paid.set(payment.membership_id, entry);
  }

  const members = (membershipsResult.data ?? []).map((row) => {
    const patient = (Array.isArray(row.patients) ? row.patients[0] : row.patients) as
      | { full_name: string; patient_number: string | null; phone: string | null }
      | null
      | undefined;
    const plan = getCarePlan(row.plan_code);
    const totals = paid.get(row.id);
    return {
      id: row.id,
      patientName: patient?.full_name ?? 'Patient',
      patientNumber: patient?.patient_number ?? null,
      phone: patient?.phone ?? null,
      planCode: row.plan_code,
      planName: plan?.name ?? row.plan_code,
      priceMinor: plan?.priceMinor ?? 0,
      status: row.status as Member['status'],
      startedAt: row.started_at,
      nextDebitOn: row.next_debit_on,
      cancelledAt: row.cancelled_at,
      paymentsMade: totals?.count ?? 0,
      totalPaidMinor: totals?.total ?? 0,
      lastPaymentAt: totals?.last ?? null,
    } satisfies Member;
  });
  return { ready: true, members };
}
