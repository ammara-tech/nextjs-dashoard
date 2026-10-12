import Link from 'next/link';
import { formatRand, getCarePlan } from '@/app/lib/care-plans';
import type { SavedCard } from '@/app/medi-clinic/ui/card-wallet';
import type { CarePlanState } from '../lib/data';
import { DocumentList, formatDate, PaymentsTable, StatusBadge } from './plan-parts';

/**
 * The patient's Family Clinic Care Plan as it appears inside the patient
 * portal: the plan and its status, what it is paid from, documents and recent
 * payments. Joining and changing the plan happens in the Care Plans dashboard.
 */
export default function PortalPlanCard({
  cards,
  state,
}: {
  cards: SavedCard[];
  state: CarePlanState;
}) {
  if (!state.ready) return null;

  const plan = state.active ? getCarePlan(state.active.plan_code) : null;
  if (!state.active || !plan) {
    return (
      <section className="rounded-2xl bg-[#0F172A] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9CC9FF]">
          Family Clinic Care Plans
        </p>
        <h2 className="mt-2 text-xl font-bold">Join a Family Clinic Care Plan</h2>
        <p className="mt-1 text-sm text-[#C7D4FF]">
          Discounted consultations and pharmacy savings, paid from the card you
          choose. No commitment, cancel anytime.
        </p>
        <Link
          className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#1E2F66] hover:bg-[#EEF2FF]"
          href="/medical-aid"
        >
          See the plans
        </Link>
      </section>
    );
  }

  const debitCard = cards.find((card) => card.id === state.active?.card_id);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#74809a]">Family Clinic Care Plan</p>
            <h2 className="mt-1 text-xl font-semibold">{plan.name}</h2>
            <p className="text-sm text-[#727a90]">{plan.tagline}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={state.active.status} />
            <p className="mt-2 text-xl font-bold">
              {formatRand(plan.priceMinor)}
              <span className="text-sm font-normal text-[#727a90]"> / month</span>
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#f7f8fc] p-3">
            <dt className="text-xs text-[#8b91a3]">Next payment</dt>
            <dd className="mt-1 text-sm font-semibold">{formatDate(state.active.next_debit_on)}</dd>
          </div>
          <div className="rounded-xl bg-[#f7f8fc] p-3">
            <dt className="text-xs text-[#8b91a3]">Paid from</dt>
            <dd className="mt-1 text-sm font-semibold">
              {debitCard ? `${debitCard.brand} •••• ${debitCard.last4}` : 'No card selected'}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f7f8fc] p-3">
            <dt className="text-xs text-[#8b91a3]">Member since</dt>
            <dd className="mt-1 text-sm font-semibold">{formatDate(state.active.started_at)}</dd>
          </div>
        </dl>
        <Link
          className="mt-4 inline-block text-sm font-semibold text-[#1E4FD8] hover:underline"
          href="/medical-aid/dashboard"
        >
          Manage my plan, card and payments
        </Link>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Plan documents</h3>
        <DocumentList planCode={state.active.plan_code} />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Recent plan payments</h3>
        <PaymentsTable limit={3} payments={state.payments} />
      </section>
    </div>
  );
}
