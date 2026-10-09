'use client';

import { useActionState, useState } from 'react';
import {
  addClinicSavedCard,
  removeClinicCard,
  setDefaultClinicCard,
  type CardActionState,
} from '../lib/actions';

export type SavedCard = {
  id: string;
  cardholder_name: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  nickname: string | null;
  is_default: boolean;
};

const input =
  'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm focus:border-[#1E4FD8] focus:ring-[#1E4FD8]';

export default function CardWallet({ cards }: { cards: SavedCard[] }) {
  const initial: CardActionState = {};
  const [state, formAction, pending] = useActionState(addClinicSavedCard, initial);
  const defaultId = cards.find((c) => c.is_default)?.id ?? cards[0]?.id ?? '';
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? defaultId;
  const [showForm, setShowForm] = useState(cards.length === 0);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#20263b]">Saved cards</h3>
        <button
          className="text-sm font-semibold text-[#1E4FD8] hover:underline"
          onClick={() => setShowForm((v) => !v)}
          type="button"
        >
          {showForm ? 'Cancel' : '+ Add card'}
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="mt-3 text-sm text-[#727a90]">No cards saved yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {cards.map((card) => {
            const isActive = card.id === activeId;
            return (
              <li
                className={`rounded-2xl border p-4 ${
                  isActive
                    ? 'border-[#1E4FD8] bg-[#EEF2FF]'
                    : 'border-[#e9eaf0] bg-white'
                }`}
                key={card.id}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    checked={isActive}
                    className="mt-1 text-[#1E4FD8] focus:ring-[#1E4FD8]"
                    name="payment_card"
                    onChange={() => setSelected(card.id)}
                    type="radio"
                  />
                  <span className="text-sm">
                    <span className="block font-semibold text-[#20263b]">
                      {card.brand} •••• {card.last4}
                      {card.is_default && (
                        <span className="ml-2 rounded-full bg-[#1E2F66] px-2 py-0.5 text-[10px] font-semibold text-white">
                          Default
                        </span>
                      )}
                    </span>
                    <span className="block text-[#727a90]">
                      {card.nickname ? `${card.nickname} · ` : ''}
                      {card.cardholder_name}
                    </span>
                    <span className="block text-xs text-[#9298a8]">
                      Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                    </span>
                  </span>
                </label>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  {!card.is_default && (
                    <form action={setDefaultClinicCard}>
                      <input name="card_id" type="hidden" value={card.id} />
                      <button className="text-[#1E4FD8] hover:underline">
                        Set as default
                      </button>
                    </form>
                  )}
                  <form action={removeClinicCard}>
                    <input name="card_id" type="hidden" value={card.id} />
                    <button className="text-red-600 hover:underline">Remove</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <form
          action={formAction}
          autoComplete="off"
          className="mt-4 grid gap-3 rounded-2xl border border-[#e9eaf0] bg-[#f7f8fc] p-4 sm:grid-cols-2"
        >
          <label className="text-sm text-[#727a90] sm:col-span-2">
            Card number
            <input
              autoComplete="cc-number"
              className={input}
              inputMode="numeric"
              maxLength={23}
              name="card_number"
              placeholder="1234 5678 9012 3456"
              required
            />
          </label>
          <label className="text-sm text-[#727a90]">
            Cardholder name
            <input
              autoComplete="cc-name"
              className={input}
              name="cardholder_name"
              required
            />
          </label>
          <label className="text-sm text-[#727a90]">
            Nickname (optional)
            <input className={input} maxLength={40} name="nickname" placeholder="e.g. Personal Visa" />
          </label>
          <label className="text-sm text-[#727a90]">
            Expiry month
            <input
              className={input}
              inputMode="numeric"
              max={12}
              min={1}
              name="exp_month"
              placeholder="MM"
              required
              type="number"
            />
          </label>
          <label className="text-sm text-[#727a90]">
            Expiry year
            <input
              className={input}
              inputMode="numeric"
              name="exp_year"
              placeholder="YYYY"
              required
              type="number"
            />
          </label>
          <p className="text-xs text-[#9298a8] sm:col-span-2">
            For your security only the card type, last 4 digits and expiry are
            stored. The full number and CVV are never saved.
          </p>
          <div className="sm:col-span-2">
            <button
              className="rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66] disabled:opacity-60"
              disabled={pending}
            >
              {pending ? 'Saving…' : 'Save card'}
            </button>
            {state.message && (
              <p
                aria-live="polite"
                className={`mt-2 text-sm ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
              >
                {state.message}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
