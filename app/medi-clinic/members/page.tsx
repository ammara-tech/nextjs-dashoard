import Link from 'next/link';
import { formatRand } from '@/app/lib/care-plans';
import { carePlans } from '@/app/lib/care-plans';
import { getT } from '@/app/lib/lang';
import { requireClinicRole } from '../lib/access';
import { loadMembers } from '../lib/members';

export const metadata = { title: 'Care Plan members' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { t, lang } = await getT();
  const { supabase } = await requireClinicRole(['owner', 'admin']);
  const { ready, members } = await loadMembers(supabase);

  if (!ready) {
    return (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6">
        <h1 className="text-2xl font-bold">{t('members.title')}</h1>
        <p className="mt-2 text-sm text-[#727a90]">
          Care Plans are not set up yet. Run <code>supabase/clinic-care-plans.sql</code> in the
          Supabase SQL editor, then refresh this page.
        </p>
      </section>
    );
  }

  const planFilter = carePlans.some((plan) => plan.code === params.plan) ? params.plan : undefined;
  const statusFilter =
    params.status === 'active' || params.status === 'cancelled' ? params.status : undefined;
  const shown = members.filter(
    (member) =>
      (!planFilter || member.planCode === planFilter) &&
      (!statusFilter || member.status === statusFilter),
  );

  const active = members.filter((member) => member.status === 'active');
  const mrr = active.reduce((sum, member) => sum + member.priceMinor, 0);
  const nextDue = active
    .map((member) => member.nextDebitOn)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  const locale = lang === 'af' ? 'af-ZA' : 'en-GB';
  const date = (value: string | null) =>
    value
      ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: value.length === 10 ? 'UTC' : 'Africa/Johannesburg',
        })
      : '—';

  const href = (next: { plan?: string; status?: string }) => {
    const query = new URLSearchParams();
    const plan = 'plan' in next ? next.plan : planFilter;
    const status = 'status' in next ? next.status : statusFilter;
    if (plan) query.set('plan', plan);
    if (status) query.set('status', status);
    const text = query.toString();
    return `/medi-clinic/members${text ? `?${text}` : ''}`;
  };
  const chip = (activeChip: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      activeChip
        ? 'border-[#0D9488] bg-[#0D9488] text-white'
        : 'border-[#e3e8f5] bg-white text-[#727a90] hover:bg-[#EEF2FF]'
    }`;

  const stats = [
    { label: t('members.active'), value: String(active.length), accent: 'bg-[#0D9488]' },
    { label: t('members.mrr'), value: formatRand(mrr), accent: 'bg-[#2DD4BF]' },
    {
      label: t('members.cancelled'),
      value: String(members.length - active.length),
      accent: 'bg-[#5B7FFF]',
    },
    { label: t('members.nextDue'), value: date(nextDue ?? null), accent: 'bg-[#1E2F66]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#74809a]">{t('members.subtitle')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{t('members.title')}</h1>
        </div>
        <a
          className="rounded-xl border border-[#e3e8f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E4FD8] shadow-sm hover:bg-[#EEF2FF]"
          href="/medi-clinic/export/members"
        >
          {t('ui.exportCsv')}
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <section
            className="relative overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm"
            key={stat.label}
          >
            <span className={`absolute inset-x-0 top-0 h-1.5 ${stat.accent}`} />
            <p className="text-sm font-medium text-[#798096]">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular text-[#1E2F66]">
              {stat.value}
            </p>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className={chip(!planFilter)} href={href({ plan: undefined })}>
          {t('members.allPlans')}
        </Link>
        {carePlans.map((plan) => (
          <Link className={chip(planFilter === plan.code)} href={href({ plan: plan.code })} key={plan.code}>
            {plan.name}
          </Link>
        ))}
        <span className="mx-1 w-px bg-[#e3e8f5]" aria-hidden="true" />
        <Link className={chip(!statusFilter)} href={href({ status: undefined })}>
          {t('members.allStatuses')}
        </Link>
        <Link className={chip(statusFilter === 'active')} href={href({ status: 'active' })}>
          {t('plan.statusActive')}
        </Link>
        <Link className={chip(statusFilter === 'cancelled')} href={href({ status: 'cancelled' })}>
          {t('plan.statusCancelled')}
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white shadow-sm">
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-[#727a90]">{t('members.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafbfe] text-xs uppercase text-[#8b91a3]">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('members.member')}</th>
                  <th className="px-5 py-3 font-medium">{t('members.plan')}</th>
                  <th className="px-5 py-3 font-medium">{t('members.status')}</th>
                  <th className="px-5 py-3 font-medium">{t('members.since')}</th>
                  <th className="px-5 py-3 font-medium">{t('members.next')}</th>
                  <th className="px-5 py-3 text-right font-medium">{t('members.paid')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {shown.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#20263b]">{member.patientName}</p>
                      <p className="text-xs text-[#8b91a3]">
                        {[member.patientNumber, member.phone].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{member.planName}</p>
                      <p className="text-xs text-[#8b91a3]">{formatRand(member.priceMinor)} / month</p>
                    </td>
                    <td className="px-5 py-4">
                      {member.status === 'active' ? (
                        <span className="rounded-full border border-[#bfead0] bg-[#eafaf1] px-2.5 py-1 text-xs font-semibold text-[#1d7f53]">
                          {t('plan.statusActive')}
                        </span>
                      ) : (
                        <span className="rounded-full border border-[#e3e5eb] bg-[#f7f8fc] px-2.5 py-1 text-xs font-semibold text-[#727a90]">
                          {t('plan.statusCancelled')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#727a90]">{date(member.startedAt)}</td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {member.status === 'active' ? date(member.nextDebitOn) : date(member.cancelledAt)}
                      {member.status === 'cancelled' ? (
                        <span className="block text-xs">{t('members.cancelledOn')}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-semibold tabular">{formatRand(member.totalPaidMinor)}</p>
                      <p className="text-xs text-[#8b91a3]">
                        {member.paymentsMade} {t('members.payments')}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
