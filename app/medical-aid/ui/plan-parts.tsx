import {
  carePlanDocuments,
  formatRand,
  getCarePlan,
  type CarePlanCode,
} from '@/app/lib/care-plans';
import type { CarePlanMembership, CarePlanPayment } from '../lib/data';

const cardClass =
  'rounded-2xl border border-[#e9eaf0] bg-white shadow-[0_8px_30px_rgba(31,41,55,0.04)]';

export function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  });
}

export function StatusBadge({ status }: { status: CarePlanMembership['status'] }) {
  return status === 'active' ? (
    <span className="rounded-full border border-[#bfead0] bg-[#eafaf1] px-3 py-1 text-xs font-semibold text-[#1d7f53]">
      Active
    </span>
  ) : (
    <span className="rounded-full border border-[#e3e5eb] bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#727a90]">
      Cancelled
    </span>
  );
}

/** Sample PDFs for a plan, as download links. */
export function DocumentList({ planCode }: { planCode: string }) {
  const code = getCarePlan(planCode)?.code as CarePlanCode | undefined;
  if (!code) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {carePlanDocuments(code).map((doc) => (
        <li key={doc.href}>
          <a
            className="flex items-start gap-3 rounded-xl border border-[#e9eaf0] p-4 hover:border-[#1E4FD8] hover:bg-[#f7f9ff]"
            href={doc.href}
            rel="noopener"
            target="_blank"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 rounded bg-[#EEF2FF] px-2 py-1 text-[10px] font-bold text-[#1E4FD8]"
            >
              PDF
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-[#20263b]">{doc.title}</span>
              <span className="block text-[#727a90]">{doc.description}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Payment history. Demo payments are labelled so nobody mistakes them for charges. */
export function PaymentsTable({
  limit,
  payments,
}: {
  limit?: number;
  payments: CarePlanPayment[];
}) {
  const rows = limit ? payments.slice(0, limit) : payments;
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-[#7b8296]">No payments yet.</p>;
  }
  return (
    <div className={`${cardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#fafbfe] text-xs uppercase tracking-wide text-[#8b91a3]">
            <tr>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Period</th>
              <th className="px-5 py-3 font-medium">Card</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eff0f4]">
            {rows.map((payment) => (
              <tr key={payment.id}>
                <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                  {formatDate(payment.created_at)}
                  <span className="block font-mono text-xs text-[#9298a8]">
                    {payment.reference}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium">
                  {getCarePlan(payment.plan_code)?.name ?? payment.plan_code}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                  {formatDate(payment.period_start)} – {formatDate(payment.period_end)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                  {payment.card_brand ?? 'Card'} •••• {payment.card_last4 ?? '----'}
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-medium">
                  {formatRand(payment.amount_minor)}
                </td>
                <td className="px-5 py-4 capitalize text-[#727a90]">
                  {payment.status}
                  {payment.is_demo ? (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium normal-case text-amber-800">
                      Demo
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SetupNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      Care plans are not set up on this database yet. Ask the clinic to run{' '}
      <code className="font-mono">supabase/clinic-care-plans.sql</code> in the
      Supabase SQL editor.
    </section>
  );
}
