'use client';

import { useMemo, useState } from 'react';

type VerificationStatus = 'verified' | 'pending' | 'check-coverage';

const providers = [
  {
    name: 'Discovery Health',
    plans: ['KeyCare Plus', 'Classic Smart', 'Essential Smart'],
  },
  {
    name: 'Momentum',
    plans: ['Momentum Custom', 'Access', 'MediPlus'],
  },
  {
    name: 'Bonitas',
    plans: ['BonComprehensive', 'BonEssential', 'BonClassic'],
  },
];

const dependentOptions = [
  'Primary member',
  'Spouse',
  'Child 1',
  'Child 2',
  'Parent/guardian',
];

const rewardCards = [
  { label: 'Momentum Multiply', value: '27 pts', tint: 'bg-[#e6f8ef] text-[#1b7f57]' },
  { label: 'Bonitas Booster', value: 'R180 available', tint: 'bg-[#eef4ff] text-[#4067d9]' },
  { label: 'Discovery Vitality', value: '3 milestones', tint: 'bg-[#fff4d9] text-[#ac7a00]' },
];

const verificationMap: Record<VerificationStatus, { label: string; className: string; note: string }> = {
  verified: {
    label: 'Active / Verified',
    className: 'bg-[#eafaf1] text-[#1d7f53] border-[#bfead0]',
    note: 'Your policy is active and the clinic can process in-network billing.',
  },
  pending: {
    label: 'Pending Verification',
    className: 'bg-[#fff4d9] text-[#9a6500] border-[#f5d99a]',
    note: 'We are waiting for a live benefit response from the switch gateway.',
  },
  'check-coverage': {
    label: 'Check Coverage / Invalid Details',
    className: 'bg-[#fdeceb] text-[#ba3d32] border-[#f7c1bc]',
    note: 'Please confirm the membership number or submit a new card for review.',
  },
};

export default function MedicalAidPanel({ patientName }: { patientName: string }) {
  const [provider, setProvider] = useState(providers[0].name);
  const [plan, setPlan] = useState(providers[0].plans[1]);
  const [memberId, setMemberId] = useState('DH-482015');
  const [membershipNumber, setMembershipNumber] = useState('M-204884');
  const [dependent, setDependent] = useState('Primary member');
  const [cardName, setCardName] = useState('discovery-card.pdf');
  const [status, setStatus] = useState<VerificationStatus>('verified');

  const planOptions = useMemo(
    () => providers.find((item) => item.name === provider)?.plans ?? providers[0].plans,
    [provider],
  );

  const summary = useMemo(
    () => ({ gross: 550, schemeCovered: 450, payable: 100, msaRemaining: 1280 }),
    [],
  );

  const currentStatus = verificationMap[status];

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[#74809a]">Medical aid & co-payment</p>
          <h2 className="mt-1 text-xl font-semibold">Coverage for {patientName}</h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${currentStatus.className}`}
        >
          {currentStatus.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4 rounded-2xl bg-[#f5f7fb] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[#727a90]">
              Medical aid provider
              <select
                className={inputClass}
                value={provider}
                onChange={(event) => {
                  const nextProvider = event.target.value;
                  const nextPlan = providers.find((item) => item.name === nextProvider)?.plans[0] ?? plan;
                  setProvider(nextProvider);
                  setPlan(nextPlan);
                }}
              >
                {providers.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#727a90]">
              Plan / option
              <select className={inputClass} value={plan} onChange={(event) => setPlan(event.target.value)}>
                {planOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#727a90]">
              Main member ID
              <input
                className={inputClass}
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              />
            </label>

            <label className="text-sm text-[#727a90]">
              Membership number
              <input
                className={inputClass}
                value={membershipNumber}
                onChange={(event) => setMembershipNumber(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[#727a90]">
              Map dependent
              <select
                className={inputClass}
                value={dependent}
                onChange={(event) => setDependent(event.target.value)}
              >
                {dependentOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#727a90]">
              Digital card upload
              <input
                accept=".pdf,.png,.jpg,.jpeg"
                className={inputClass}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setCardName(file ? file.name : 'discovery-card.pdf');
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe6f4] bg-white p-3">
            <div>
              <p className="text-sm font-medium">Digital card</p>
              <p className="text-xs text-[#727a90]">{cardName}</p>
            </div>
            <div className="flex gap-2">
              <button className={secondaryButtonClass} type="button" onClick={() => setStatus('pending')}>
                Save draft
              </button>
              <button className={buttonClass} type="button" onClick={() => setStatus('verified')}>
                Verify cover
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e9eaf0] bg-[#f9fafc] p-4">
            <p className="text-sm text-[#74809a]">Switch feedback</p>
            <p className="mt-2 text-sm text-[#727a90]">{currentStatus.note}</p>
            <div className="mt-4 rounded-xl border border-[#dfe6f4] bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[#7c869b]">Rate check</p>
              <p className="mt-2 font-semibold text-[#1d2940]">✓ In-network rate applied: 100% covered by scheme.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e9eaf0] bg-[#f9fafc] p-4">
            <p className="text-sm text-[#74809a]">Pre-authorisation</p>
            <p className="mt-2 text-sm text-[#727a90]">
              {status === 'verified'
                ? 'No additional approval is required for this booked consultation.'
                : 'A specialist referral requires a provider pre-authorisation before booking.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e9eaf0] bg-white p-4">
          <p className="text-sm text-[#74809a]">Gross cost</p>
          <p className="mt-2 text-2xl font-bold text-[#1d2940]">R{summary.gross.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-[#e9eaf0] bg-white p-4">
          <p className="text-sm text-[#74809a]">Scheme covered</p>
          <p className="mt-2 text-2xl font-bold text-[#1d2940]">-R{summary.schemeCovered.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-[#e9eaf0] bg-white p-4">
          <p className="text-sm text-[#74809a]">Payable now</p>
          <p className="mt-2 text-2xl font-bold text-[#1d2940]">R{summary.payable.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#e9eaf0] bg-[#f8fbff] p-4">
          <h3 className="text-base font-semibold">Medical savings account</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dfe8ff] text-sm font-bold text-[#4865d6]">
              {Math.round((summary.msaRemaining / 2000) * 100)}%
            </div>
            <div>
              <p className="text-sm text-[#727a90]">Remaining day-to-day funds</p>
              <p className="text-2xl font-bold text-[#1d2940]">R{summary.msaRemaining.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e9eaf0] bg-[#f8fbff] p-4">
          <h3 className="text-base font-semibold">Rewards & wellness</h3>
          <div className="mt-4 grid gap-2">
            {rewardCards.map((reward) => (
              <div className={`flex items-center justify-between rounded-xl p-3 text-sm ${reward.tint}`} key={reward.label}>
                <span>{reward.label}</span>
                <span className="font-semibold">{reward.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border border-[#dfe3ee] bg-white px-3 py-2.5 text-sm text-[#1d2940] outline-none focus:border-[#6177e8]';
const buttonClass =
  'rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526be8]';
const secondaryButtonClass =
  'rounded-xl border border-[#dfe3ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#263351] hover:bg-[#f1f4fb]';
