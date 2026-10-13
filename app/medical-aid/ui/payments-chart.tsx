import { formatRand, getCarePlan } from '@/app/lib/care-plans';
import ChartHoverArea from '@/app/ui/chart-hover';
import { tip } from '@/app/ui/chart-tip';
import type { CarePlanPayment } from '../lib/data';

/** Care Plan payments over the last six months. Hover a bar for the details. */
export default function PaymentsChart({ payments }: { payments: CarePlanPayment[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short' }),
      long: date.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
    };
  });
  const rows = months.map((month) => {
    const inMonth = payments.filter(
      (payment) => payment.status === 'paid' && payment.created_at.slice(0, 7) === month.key,
    );
    return {
      ...month,
      count: inMonth.length,
      total: inMonth.reduce((sum, payment) => sum + payment.amount_minor, 0),
      plans: Array.from(
        new Set(inMonth.map((payment) => getCarePlan(payment.plan_code)?.name ?? payment.plan_code)),
      ),
    };
  });
  const max = Math.max(1, ...rows.map((row) => row.total));
  const grand = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#798096]">Your payments</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20263b]">Paid by month</h2>
        </div>
        <span className="rounded-full bg-[#E6F7F5] px-3 py-1 text-xs font-semibold text-[#0F766E]">
          Last 6 months
        </span>
      </div>
      <ChartHoverArea>
        <div
          aria-label="Care Plan payments by month. Hover or focus a bar for details."
          className="mt-6 grid h-44 grid-cols-6 items-end gap-3"
          role="group"
        >
          {rows.map((row) => (
            <div
              aria-label={`${row.long}: ${formatRand(row.total)} in ${row.count} payments`}
              className="group flex h-full cursor-pointer flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              data-tip={tip({
                title: row.long,
                rows: [
                  { label: 'Paid', value: formatRand(row.total), color: '#0D9488' },
                  { label: 'Payments', value: String(row.count) },
                  { label: 'Plan', value: row.plans.length > 0 ? row.plans.join(', ') : 'None' },
                ],
                footnote: `${formatRand(grand)} paid in the last 6 months (demo payments)`,
              })}
              key={row.key}
              tabIndex={0}
            >
              <span className="text-xs font-semibold text-[#737b91]">
                {row.total === 0 ? '0' : formatRand(row.total)}
              </span>
              <div className="flex h-32 w-full items-end rounded-t-lg bg-[#f5f6fb] transition group-hover:bg-[#e8f6f4]">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#0D9488] to-[#5EEAD4] transition group-hover:brightness-110"
                  style={{
                    height: row.total === 0 ? '0%' : `${Math.max(6, (row.total / max) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-[#8b91a3]">{row.label}</span>
            </div>
          ))}
        </div>
      </ChartHoverArea>
    </section>
  );
}
