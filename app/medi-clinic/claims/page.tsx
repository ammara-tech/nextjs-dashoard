import { formatRand } from '@/app/lib/care-plans';
import {
  claimColumns,
  claimKey,
  nextClaimStatuses,
  type Claim,
} from '@/app/lib/claims';
import { getT } from '@/app/lib/lang';
import { ClaimBadge, ClaimStats } from '@/app/ui/claim-parts';
import { requireClinicRole } from '../lib/access';
import { updateClaimStatus } from '../lib/claim-actions';

export const metadata = { title: 'Claims' };

export default async function ClaimsBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { error: errorMessage, updated } = await searchParams;
  const { t, lang } = await getT();
  const { supabase } = await requireClinicRole(['owner', 'admin', 'front_desk']);

  const { data, error } = await supabase
    .from('clinic_claims')
    .select(
      'id, patient_id, reference, description, amount_minor, status, decision_note, submitted_at, updated_at, paid_at, patients(full_name)',
    )
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Claims board error:', error);
    return (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6">
        <h1 className="text-2xl font-bold">{t('claims.title')}</h1>
        <p className="mt-2 text-sm text-[#727a90]">
          Claim tracking is not set up yet. Run <code>supabase/clinic-claims.sql</code> in the
          Supabase SQL editor, then refresh this page.
        </p>
      </section>
    );
  }

  const claims = (data ?? []) as unknown as Claim[];
  const locale = lang === 'af' ? 'af-ZA' : 'en-GB';
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Johannesburg',
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-[#74809a]">{t('claims.subtitle')}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t('claims.title')}</h1>
      </div>
      <a
        className="rounded-xl border border-[#e3e8f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E4FD8] shadow-sm hover:bg-[#EEF2FF]"
        href="/medi-clinic/export/claims"
      >
        {t('ui.exportCsv')}
      </a>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {updated === '1' ? (
        <p className="rounded-xl border border-[#bfead0] bg-[#eafaf1] px-4 py-3 text-sm text-[#1d7f53]" role="status">
          ✓
        </p>
      ) : null}

      <ClaimStats claims={claims} t={t} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {claimColumns.map((status) => {
          const column = claims.filter((claim) => claim.status === status);
          return (
            <section
              className="rounded-2xl border border-[#e9eaf0] bg-[#fafbfe] p-3"
              key={status}
            >
              <div className="flex items-center justify-between px-1 pb-3">
                <ClaimBadge status={status} t={t} />
                <span className="text-xs font-semibold text-[#8b91a3]">{column.length}</span>
              </div>
              <ul className="space-y-3">
                {column.length === 0 ? (
                  <li className="px-1 py-4 text-center text-xs text-[#8b91a3]">—</li>
                ) : (
                  column.map((claim) => (
                    <li
                      className="rounded-xl border border-[#e9eaf0] bg-white p-3 text-sm shadow-sm"
                      key={claim.id}
                    >
                      <p className="font-semibold text-[#20263b]">
                        {claim.patients?.full_name ?? '—'}
                      </p>
                      <p className="mt-0.5 text-xs text-[#727a90]">{claim.description}</p>
                      <p className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0F766E]">{formatRand(claim.amount_minor)}</span>
                        <span className="text-[#8b91a3]">
                          {claim.reference} · {date(claim.submitted_at)}
                        </span>
                      </p>
                      {claim.decision_note ? (
                        <p className="mt-2 rounded-lg bg-[#f7f8fc] px-2 py-1.5 text-xs text-[#727a90]">
                          {claim.decision_note}
                        </p>
                      ) : null}
                      {nextClaimStatuses[claim.status].length > 0 ? (
                        <form action={updateClaimStatus} className="mt-3 space-y-2">
                          <input name="claim_id" type="hidden" value={claim.id} />
                          <input
                            className="block w-full rounded-lg border-[#e3e5eb] text-xs"
                            maxLength={200}
                            name="note"
                            placeholder={t('claims.reason')}
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {nextClaimStatuses[claim.status].map((next) => (
                              <button
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                                  next === 'rejected'
                                    ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                    : 'bg-[#0D9488] text-white hover:bg-[#0F766E]'
                                }`}
                                key={next}
                                name="status"
                                type="submit"
                                value={next}
                              >
                                {t('claims.move')} {t(claimKey(next))}
                              </button>
                            ))}
                          </div>
                        </form>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
