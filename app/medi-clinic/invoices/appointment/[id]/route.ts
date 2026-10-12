import { createClient } from '@/lib/supabase/server';
import {
  invoiceNumber,
  pdfResponse,
  plain,
  titleCase,
  uuidPattern,
} from '@/app/lib/invoice-response';

export const dynamic = 'force-dynamic';

const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : (value ?? undefined);

// Invoice for an appointment, built from the services (treatments) recorded
// for it. It is marked Paid once paid payments cover the total.
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

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(
      'id, patient_id, starts_at, duration_minutes, clinic_appointment_types(name, duration_minutes), clinic_providers(display_name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Appointment invoice lookup error:', error);
    return plain('Unable to load this invoice.', 500);
  }
  if (!appointment) return plain('Invoice not found.', 404);

  const [patientResult, treatmentsResult, paymentsResult] = await Promise.all([
    supabase
      .from('patients')
      .select('full_name, patient_number')
      .eq('id', appointment.patient_id)
      .maybeSingle(),
    supabase
      .from('treatments')
      .select('procedure, fee_cents')
      .eq('appointment_id', id)
      .order('created_at'),
    supabase
      .from('clinic_payments')
      .select('amount_minor, method, status')
      .eq('appointment_id', id),
  ]);

  const treatments = treatmentsResult.data ?? [];
  if (treatments.length === 0) {
    return plain(
      'No services have been recorded for this appointment yet, so there is nothing to invoice.',
      404,
    );
  }

  const type = one(appointment.clinic_appointment_types);
  const provider = one(appointment.clinic_providers);
  const minutes = type?.duration_minutes ?? appointment.duration_minutes;
  const visit = `${type?.name ?? 'Clinic appointment'}${minutes ? ` (${minutes} min)` : ''}${
    provider?.display_name ? ` - ${provider.display_name}` : ''
  }`;
  const lines = [
    ...treatments.map((treatment) => ({
      description: `${treatment.procedure} - ${visit}`,
      quantity: 1,
      unitMinor: treatment.fee_cents,
    })),
  ];
  const total = lines.reduce((sum, line) => sum + line.unitMinor, 0);
  const paidPayments = (paymentsResult.data ?? []).filter((p) => p.status === 'paid');
  const paid = paidPayments.reduce((sum, p) => sum + p.amount_minor, 0);
  const settled = total > 0 && paid >= total;

  const patient = patientResult.data;
  return pdfResponse({
    number: invoiceNumber('AP', appointment.starts_at, appointment.id),
    date: appointment.starts_at.slice(0, 10),
    billedTo: patient
      ? `${patient.full_name}${patient.patient_number ? ` (${patient.patient_number})` : ''}`
      : 'Patient',
    status: settled ? 'Paid' : 'Unpaid',
    method: settled && paidPayments[0] ? titleCase(paidPayments[0].method) : 'Pending',
    totalLabel: settled ? 'Total paid' : 'Total due',
    lines,
    note: 'Amounts are in South African Rand (ZAR). Medical aid claims are not processed in this demo.',
    footer: 'FAMILY CLINIC - DEMONSTRATION INVOICE',
  });
}
