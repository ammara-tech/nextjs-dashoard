'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { SavedCard } from '@/app/medi-clinic/ui/card-wallet';
import {
  cancelCarePlan,
  changeCarePlanCard,
  enrolInCarePlan,
  type PlanActionState,
} from '../actions';

const buttonClass =
  'rounded-xl bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:cursor-not-allowed disabled:opacity-60';

function isExpired(card: SavedCard) {
  const now = new Date();
  return (
    card.exp_year < now.getFullYear() ||
    (card.exp_year === now.getFullYear() && card.exp_month < now.getMonth() + 1)
  );
}

function cardLabel(card: SavedCard) {
  const expiry = `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`;
  return `${card.brand} •••• ${card.last4} · expires ${expiry}`;
}

function Message({ state }: { state: PlanActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`mt-3 text-sm ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
      role={state.success ? 'status' : 'alert'}
    >
      {state.message}
    </p>
  );
}

/** Join a plan, paid from one of the person's saved cards. */
export function EnrolForm({
  cards,
  cardsHref,
  planCode,
  planName,
  priceLabel,
}: {
  cards: SavedCard[];
  cardsHref: string;
  planCode: string;
  planName: string;
  priceLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(
    enrolInCarePlan,
    {},
  );
  const usable = cards.filter((card) => !isExpired(card));
  const defaultId = (usable.find((card) => card.is_default) ?? usable[0])?.id;

  if (usable.length === 0) {
    return (
      <div className="rounded-xl bg-[#f7f8fc] p-4 text-sm text-[#727a90]">
        Save a card first. It is the card your plan is paid from.{' '}
        <Link className="font-semibold text-[#0D9488] hover:underline" href={cardsHref}>
          Add a card
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input name="plan_code" type="hidden" value={planCode} />
      <fieldset>
        <legend className="text-sm font-medium text-[#404960]">
          Pay {planName} from this card
        </legend>
        <div className="mt-3 space-y-2">
          {cards.map((card) => {
            const expired = isExpired(card);
            return (
              <label
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                  expired
                    ? 'cursor-not-allowed border-[#e9eaf0] bg-[#fafbfe] text-[#9298a8]'
                    : 'cursor-pointer border-[#e9eaf0] hover:bg-[#f7f8fc]'
                }`}
                key={card.id}
              >
                <input
                  className="text-[#0D9488] focus:ring-[#0D9488]"
                  defaultChecked={card.id === defaultId}
                  disabled={expired}
                  name="card_id"
                  required
                  type="radio"
                  value={card.id}
                />
                <span>
                  {cardLabel(card)}
                  {expired ? ' (expired)' : ''}
                  {card.is_default && !expired ? ' · default' : ''}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-3 text-xs text-[#9298a8]">
        Demo mode: your plan is recorded and a sample payment is shown, but no
        money is taken from your card.
      </p>
      <button className={`${buttonClass} mt-4`} disabled={pending} type="submit">
        {pending ? 'Joining…' : `Join ${planName} · ${priceLabel} / month`}
      </button>
      <Message state={state} />
    </form>
  );
}

/** Switch which saved card the active plan is paid from. */
export function ChangeCardForm({
  cards,
  currentCardId,
}: {
  cards: SavedCard[];
  currentCardId: string | null;
}) {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(
    changeCarePlanCard,
    {},
  );
  const usable = cards.filter((card) => !isExpired(card));
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="min-w-56 flex-1 text-sm text-[#727a90]">
        Paid from
        <select
          className="mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm"
          defaultValue={currentCardId ?? usable[0]?.id}
          name="card_id"
        >
          {usable.map((card) => (
            <option key={card.id} value={card.id}>
              {cardLabel(card)}
            </option>
          ))}
        </select>
      </label>
      <button className={buttonClass} disabled={pending || usable.length === 0} type="submit">
        {pending ? 'Saving…' : 'Use this card'}
      </button>
      <div className="w-full">
        <Message state={state} />
      </div>
    </form>
  );
}

/** Cancel the plan, with a confirmation step so it cannot happen by accident. */
export function CancelPlanForm() {
  const [state, formAction, pending] = useActionState<PlanActionState, FormData>(
    (previous: PlanActionState) => cancelCarePlan(previous),
    {},
  );
  return (
    <details className="rounded-xl border border-[#e9eaf0] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-red-600">
        Cancel my plan
      </summary>
      <form action={formAction} className="mt-3">
        <p className="text-sm text-[#727a90]">
          Your plan will end and no further payments will be recorded. Your
          payment history stays available. You can join again at any time.
        </p>
        <button
          className="mt-3 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Cancelling…' : 'Yes, cancel my plan'}
        </button>
        <Message state={state} />
      </form>
    </details>
  );
}
