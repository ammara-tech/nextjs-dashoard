import { formatRand, type CarePlan } from '@/app/lib/care-plans';
import type { Key } from '@/app/lib/i18n';
import type { CarePlanMembership, CarePlanPayment } from '../lib/data';

type T = (key: Key) => string;

const TERM = 12;

function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day));
}

/**
 * Progress through the first 12 months of a plan, the next payment, and a
 * schedule of what was paid and what is coming. Future rows are projected from
 * the next debit date and the plan price.
 */
export default function PlanProgress({
  membership,
  payments,
  plan,
  t,
  locale,
}: {
  membership: CarePlanMembership;
  payments: CarePlanPayment[];
  plan: CarePlan;
  t: T;
  locale: string;
}) {
  const startedOn = membership.started_at.slice(0, 10);
  const current = payments
    .filter((payment) => payment.plan_code === membership.plan_code && payment.period_start >= startedOn)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  const paid = current.filter((payment) => payment.status === 'paid');
  const totalPaid = paid.reduce((sum, payment) => sum + payment.amount_minor, 0);
  const monthsPaid = Math.min(paid.length, TERM);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const nextOn = membership.next_debit_on;
  const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86_400_000);
  const daysUntil = nextOn ? dayNumber(nextOn) - dayNumber(today) : null;

  const monthLabel = (date: Date) =>
    date.toLocaleDateString(locale, { timeZone: 'UTC', month: 'short', year: 'numeric' });

  type Row = { key: string; label: string; amount: number; status: 'paid' | 'failed' | 'refunded' | 'upcoming' };
  const rows: Row[] = current.slice(0, TERM).map((payment) => ({
    key: payment.id,
    label: monthLabel(addMonths(payment.period_start, 0)),
    amount: payment.amount_minor,
    status: payment.status,
  }));
  if (nextOn) {
    for (let i = 0; rows.length < TERM; i += 1) {
      rows.push({
        key: `upcoming-${i}`,
        label: monthLabel(addMonths(nextOn, i)),
        amount: plan.priceMinor,
        status: 'upcoming',
      });
    }
  }

  const tone: Record<Row['status'], string> = {
    paid: 'border-[#bfead0] bg-[#eafaf1] text-[#1d7f53]',
    upcoming: 'border-[#e3e8f5] bg-[#f7f8fc] text-[#727a90]',
    failed: 'border-rose-200 bg-rose-50 text-rose-700',
    refunded: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  const statusLabel: Record<Row['status'], string> = {
    paid: t('plan.paid'),
    upcoming: t('plan.upcoming'),
    failed: t('plan.failed'),
    refunded: t('plan.refunded'),
  };

  const dueText =
    daysUntil === null
      ? t('plan.noDebit')
      : daysUntil < 0
        ? `${Math.abs(daysUntil)} ${t('plan.days')} ${t('plan.overdue')}`
        : daysUntil === 0
          ? t('plan.dueToday')
          : `${t('plan.dueIn')} ${daysUntil} ${t('plan.days')}`;

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[#74809a]">{t('plan.progress')}</p>
          <h2 className="mt-1 text-lg font-semibold">
            {monthsPaid} / {TERM} {t('plan.monthsPaid')}
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#0F766E]">
          {Math.round((monthsPaid / TERM) * 100)}%
        </p>
      </div>
      <div
        aria-valuemax={TERM}
        aria-valuemin={0}
        aria-valuenow={monthsPaid}
        className="mt-3 h-3 overflow-hidden rounded-full bg-[#E6F7F5]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0D9488] to-[#2DD4BF] transition-all"
          style={{ width: `${(monthsPaid / TERM) * 100}%` }}
        />
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#f7f8fc] p-4">
          <dt className="text-xs text-[#8b91a3]">{t('plan.nextPayment')}</dt>
          <dd className="mt-1 font-semibold">
            {nextOn
              ? new Date(`${nextOn}T00:00:00Z`).toLocaleDateString(locale, {
                  timeZone: 'UTC',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </dd>
          <dd className="text-xs text-[#727a90]">{dueText}</dd>
        </div>
        <div className="rounded-xl bg-[#f7f8fc] p-4">
          <dt className="text-xs text-[#8b91a3]">{t('plan.totalPaid')}</dt>
          <dd className="mt-1 font-semibold">{formatRand(totalPaid)}</dd>
        </div>
        <div className="rounded-xl bg-[#f7f8fc] p-4">
          <dt className="text-xs text-[#8b91a3]">{plan.name}</dt>
          <dd className="mt-1 font-semibold">{formatRand(plan.priceMinor)} / month</dd>
        </div>
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-[#20263b]">{t('plan.schedule')}</h3>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <li className={`rounded-xl border px-3 py-2.5 text-xs ${tone[row.status]}`} key={row.key}>
            <p className="font-semibold">{row.label}</p>
            <p className="mt-0.5 flex justify-between gap-2">
              <span>{formatRand(row.amount)}</span>
              <span className="font-medium">{statusLabel[row.status]}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
