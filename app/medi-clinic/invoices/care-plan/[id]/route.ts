import { createClient } from '@/lib/supabase/server';
import { getCarePlan } from '@/app/lib/care-plans';
import {
  invoiceNumber,
  pdfResponse,
  plain,
  titleCase,
  uuidPattern,
} from '@/app/lib/invoice-response';

export const dynamic = 'force-dynamic';

// Invoice for one Care Plan payment. Row-level security decides who can read
// the payment, so a patient only ever gets their own invoices.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return plain('Invoice not found.', 404);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return plain('Sign in to download invoices.', 401);

  const { data: payment, error } = await supabase
    .from('clinic_care_plan_payments')
    .select(
      'id, patient_id, plan_code, amount_minor, currency, card_brand, card_last4, status, is_demo, period_start, period_end, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Care plan invoice lookup error:', error);
    return plain('Unable to load this invoice.', 500);
  }
  if (!payment) return plain('Invoice not found.', 404);

  const { data: patient } = await supabase
    .from('patients')
    .select('full_name, patient_number')
    .eq('id', payment.patient_id)
    .maybeSingle();

  const planName = getCarePlan(payment.plan_code)?.name ?? payment.plan_code;
  const card = payment.card_last4
    ? `${payment.card_brand ?? 'Card'} ending ${payment.card_last4}`
    : 'Saved card';

  return pdfResponse({
    number: invoiceNumber('CP', payment.created_at, payment.id),
    date: payment.created_at.slice(0, 10),
    billedTo: patient
      ? `${patient.full_name}${patient.patient_number ? ` (${patient.patient_number})` : ''}`
      : 'Patient',
    status: titleCase(payment.status),
    method: card,
    currency: payment.currency,
    totalLabel: payment.status === 'paid' ? 'Total paid' : 'Total due',
    lines: [
      {
        description: `${planName} Care Plan - monthly membership (${payment.period_start} to ${payment.period_end})`,
        quantity: 1,
        unitMinor: payment.amount_minor,
      },
    ],
    note: payment.is_demo
      ? 'Demo payment: no money was charged and no payment gateway is connected. Plan prices are illustrative and final terms are confirmed by the clinic.'
      : 'Plan prices are illustrative and final terms are confirmed by the clinic.',
    footer: payment.is_demo
      ? 'DEMO INVOICE - NO REAL PAYMENT WAS TAKEN'
      : 'FAMILY CLINIC CARE PLAN INVOICE',
  });
}
