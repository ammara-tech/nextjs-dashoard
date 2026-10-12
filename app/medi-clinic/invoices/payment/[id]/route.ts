import { createClient } from '@/lib/supabase/server';
import {
  invoiceNumber,
  pdfResponse,
  plain,
  titleCase,
  uuidPattern,
} from '@/app/lib/invoice-response';

export const dynamic = 'force-dynamic';

// Invoice for one payment recorded in the clinic payment register.
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
    .from('clinic_payments')
    .select('id, patient_id, appointment_id, amount_minor, currency, method, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Payment invoice lookup error:', error);
    return plain('Unable to load this invoice.', 500);
  }
  if (!payment) return plain('Invoice not found.', 404);

  const { data: patient } = await supabase
    .from('patients')
    .select('full_name, patient_number')
    .eq('id', payment.patient_id)
    .maybeSingle();

  let description = 'Clinic payment received';
  if (payment.appointment_id) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('starts_at, clinic_appointment_types(name), clinic_providers(display_name)')
      .eq('id', payment.appointment_id)
      .maybeSingle();
    if (appointment) {
      const type = Array.isArray(appointment.clinic_appointment_types)
        ? appointment.clinic_appointment_types[0]
        : appointment.clinic_appointment_types;
      const provider = Array.isArray(appointment.clinic_providers)
        ? appointment.clinic_providers[0]
        : appointment.clinic_providers;
      description = `${type?.name ?? 'Clinic appointment'}${
        provider?.display_name ? ` - ${provider.display_name}` : ''
      } (${appointment.starts_at.slice(0, 10)})`;
    }
  }

  return pdfResponse({
    number: invoiceNumber('PM', payment.created_at, payment.id),
    date: payment.created_at.slice(0, 10),
    billedTo: patient
      ? `${patient.full_name}${patient.patient_number ? ` (${patient.patient_number})` : ''}`
      : 'Patient',
    status: titleCase(payment.status),
    method: titleCase(payment.method),
    currency: payment.currency,
    totalLabel: payment.status === 'paid' ? 'Total paid' : 'Total due',
    lines: [{ description, quantity: 1, unitMinor: payment.amount_minor }],
    note: 'Medical aid claims are not processed in this demo.',
    footer: 'FAMILY CLINIC - PAYMENT RECEIPT AND INVOICE',
  });
}
