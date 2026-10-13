import { formatRand } from '@/app/lib/care-plans';
import {
  claimKey,
  claimSteps,
  claimStats,
  claimTone,
  type Claim,
  type ClaimStatus,
} from '@/app/lib/claims';
import type { Key } from '@/app/lib/i18n';

type T = (key: Key) => string;

export function ClaimBadge({ status, t }: { status: ClaimStatus; t: T }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${claimTone[status]}`}>
      {t(claimKey(status))}
    </span>
  );
}

/** Submitted > In review > Approved > Paid, with the current stage highlighted. */
export function ClaimTracker({ status, t }: { status: ClaimStatus; t: T }) {
  const rejected = status === 'rejected';
  const steps: ClaimStatus[] = rejected
    ? ['submitted', 'in_review', 'rejected']
    : claimSteps;
  const current = steps.indexOf(status);
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const reached = index <= current;
        const isRejected = rejected && step === 'rejected';
        return (
          <li className="flex flex-1 items-center gap-1.5" key={step}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isRejected
                  ? 'bg-rose-500 text-white'
                  : reached
                    ? 'bg-[#0D9488] text-white'
                    : 'bg-[#EEF2FF] text-[#8b91a3]'
              }`}
            >
              {isRejected ? '×' : reached ? '✓' : index + 1}
            </span>
            <span
              className={`hidden text-[11px] font-medium sm:block ${
                reached ? 'text-[#20263b]' : 'text-[#8b91a3]'
              }`}
            >
              {t(claimKey(step))}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 rounded ${index < current ? 'bg-[#0D9488]' : 'bg-[#e3e8f5]'}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ClaimStats({ claims, t }: { claims: Claim[]; t: T }) {
  const stats = claimStats(claims);
  const items = [
    { label: t('claims.open'), value: String(stats.open), accent: 'bg-[#0D9488]' },
    {
      label: t('claims.successRate'),
      value: stats.approvalRate === null ? '—' : `${stats.approvalRate}%`,
      accent: 'bg-[#2DD4BF]',
    },
    { label: t('claims.totalClaimed'), value: formatRand(stats.totalClaimed), accent: 'bg-[#0F766E]' },
    { label: t('claims.totalPaid'), value: formatRand(stats.totalPaid), accent: 'bg-[#5EEAD4]' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <section
          className="relative overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm"
          key={item.label}
        >
          <span className={`absolute inset-x-0 top-0 h-1.5 ${item.accent}`} />
          <p className="text-sm font-medium text-[#798096]">{item.label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight tabular text-[#0F766E]">
            {item.value}
          </p>
        </section>
      ))}
    </div>
  );
}
