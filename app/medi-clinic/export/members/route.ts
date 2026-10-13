import { csvResponse, money, toCsv } from '@/app/lib/csv';
import { exportAccess } from '../../lib/export-access';
import { loadMembers } from '../../lib/members';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await exportAccess(['owner', 'admin']);
  if ('response' in access) return access.response;
  const { ready, members } = await loadMembers(access.supabase);
  if (!ready) return new Response('Care Plans are not set up yet.', { status: 503 });

  const csv = toCsv(
    [
      'Patient', 'Patient number', 'Phone', 'Plan', 'Monthly price (ZAR)', 'Status',
      'Member since', 'Next payment', 'Cancelled on', 'Payments made', 'Total paid (ZAR)', 'Last payment',
    ],
    members.map((member) => [
      member.patientName,
      member.patientNumber,
      member.phone,
      member.planName,
      money(member.priceMinor),
      member.status,
      member.startedAt.slice(0, 10),
      member.nextDebitOn,
      member.cancelledAt?.slice(0, 10),
      member.paymentsMade,
      money(member.totalPaidMinor),
      member.lastPaymentAt?.slice(0, 10),
    ]),
  );
  return csvResponse(`care-plan-members-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
