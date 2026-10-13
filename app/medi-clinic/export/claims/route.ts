import { csvResponse, money, toCsv } from '@/app/lib/csv';
import { exportAccess } from '../../lib/export-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await exportAccess(['owner', 'admin', 'front_desk']);
  if ('response' in access) return access.response;

  const { data, error } = await access.supabase
    .from('clinic_claims')
    .select(
      'reference, description, amount_minor, status, decision_note, submitted_at, updated_at, paid_at, patients(full_name, patient_number)',
    )
    .order('submitted_at', { ascending: false })
    .limit(5000);
  if (error) {
    console.error('Claims export error:', error);
    return new Response('Claims are not set up yet, or could not be loaded.', { status: 503 });
  }

  const csv = toCsv(
    [
      'Reference', 'Patient', 'Patient number', 'Description', 'Amount (ZAR)', 'Status',
      'Decision note', 'Submitted', 'Updated', 'Paid on',
    ],
    (data ?? []).map((claim) => {
      const patient = (Array.isArray(claim.patients) ? claim.patients[0] : claim.patients) as
        | { full_name: string; patient_number: string | null }
        | null
        | undefined;
      return [
        claim.reference,
        patient?.full_name,
        patient?.patient_number,
        claim.description,
        money(claim.amount_minor),
        claim.status,
        claim.decision_note,
        claim.submitted_at,
        claim.updated_at,
        claim.paid_at,
      ];
    }),
  );
  return csvResponse(`claims-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
