import { csvResponse, money, toCsv } from '@/app/lib/csv';
import { exportAccess } from '../../lib/export-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await exportAccess(['owner', 'admin', 'front_desk']);
  if ('response' in access) return access.response;

  const [paymentsResult, patientsResult] = await Promise.all([
    access.supabase
      .from('clinic_payments')
      .select('id, patient_id, amount_minor, currency, method, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    access.supabase.from('patients').select('id, full_name, patient_number'),
  ]);
  if (paymentsResult.error) {
    console.error('Payments export error:', paymentsResult.error);
    return new Response('Unable to export payments.', { status: 500 });
  }
  const patients = new Map(
    (
      (patientsResult.data ?? []) as {
        id: string;
        full_name: string;
        patient_number: string | null;
      }[]
    ).map((patient) => [patient.id, patient]),
  );

  const csv = toCsv(
    ['Reference', 'Patient', 'Patient number', 'Amount', 'Currency', 'Method', 'Status', 'Recorded'],
    (paymentsResult.data ?? []).map((payment) => [
      payment.id,
      patients.get(payment.patient_id)?.full_name ?? 'Patient',
      patients.get(payment.patient_id)?.patient_number,
      money(payment.amount_minor),
      payment.currency,
      payment.method,
      payment.status,
      payment.created_at,
    ]),
  );
  return csvResponse(`payments-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
