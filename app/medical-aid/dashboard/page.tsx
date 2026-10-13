import Link from 'next/link';
import { formatRand, getCarePlan, type CarePlanCode } from '@/app/lib/care-plans';
import { getClinicAccess } from '@/app/medi-clinic/lib/access';
import CardWallet, { type SavedCard } from '@/app/medi-clinic/ui/card-wallet';
import CarePlanCards from '@/app/ui/care-plan-cards';
import { loadCarePlanState } from '../lib/data';
import { CancelPlanForm, ChangeCardForm, EnrolForm } from '../ui/plan-forms';
import PaymentsChart from '../ui/payments-chart';
import {
  DocumentList,
  formatDate,
  PaymentsTable,
  SetupNotice,
  StatusBadge,
} from '../ui/plan-parts';

export const metadata = { title: 'My care plans' };

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'plans', label: 'Choose a plan' },
  { id: 'cards', label: 'Cards' },
  { id: 'payments', label: 'Payments' },
  { id: 'documents', label: 'Documents' },
] as const;

const cardClass =
  'rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]';

export default async function MedicalAidDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    plan?: string;
    joined?: string;
    cancelled?: string;
  }>;
}) {
  const { tab: requestedTab, plan: requestedPlan, joined, cancelled } =
    await searchParams;
  const { supabase, user, role } = await getClinicAccess();

  if (role !== 'patient') {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-bold">Care Plans is a patient area</h1>
        <p className="mt-2 text-sm text-[#727a90]">
          Patients join and manage their plans here. Clinic staff work from the
          clinic dashboard.
        </p>
        <Link
          className="mt-4 inline-block rounded-xl bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E]"
          href="/medi-clinic"
        >
          Open the clinic dashboard
        </Link>
      </section>
    );
  }

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (patientError) {
    console.error('Care plans patient lookup error:', patientError);
    throw new Error('Unable to load your patient profile.');
  }
  if (!patient) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-bold">Patient account not linked</h1>
        <p className="mt-2 text-sm text-[#727a90]">
          Contact the clinic reception team to securely link this sign-in to your
          patient record.
        </p>
      </section>
    );
  }

  const [state, cardsResult] = await Promise.all([
    loadCarePlanState(supabase, patient.id),
    supabase
      .from('clinic_saved_cards')
      .select('id, cardholder_name, brand, last4, exp_month, exp_year, nickname, is_default')
      .order('created_at', { ascending: true }),
  ]);
  if (cardsResult.error) {
    console.error('Care plans saved cards error:', cardsResult.error);
  }
  const cards = (cardsResult.data ?? []) as SavedCard[];

  const asked = getCarePlan(requestedPlan);
  const tab = tabs.some((item) => item.id === requestedTab)
    ? (requestedTab as (typeof tabs)[number]['id'])
    : 'overview';
  const activePlan = state.active ? getCarePlan(state.active.plan_code) : null;
  const debitCard = state.active
    ? cards.find((card) => card.id === state.active?.card_id) ?? null
    : null;
  const documentsPlan = state.active ?? state.latest;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#74809a]">Family Clinic Care Plans</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#20263b]">
          Hello, {patient.full_name.split(' ')[0]}
        </h1>
      </div>

      <nav
        aria-label="Care plans"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e9eaf0] bg-white p-1.5 shadow-sm"
      >
        {tabs.map((item) => (
          <Link
            aria-current={tab === item.id ? 'page' : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-[#0F766E] text-white'
                : 'text-[#727a90] hover:bg-[#E6F7F5] hover:text-[#0F766E]'
            }`}
            href={`/medical-aid/dashboard?tab=${item.id}`}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {!state.ready ? <SetupNotice /> : null}

      {joined === '1' && activePlan ? (
        <p
          className="rounded-xl border border-[#bfead0] bg-[#eafaf1] px-4 py-3 text-sm text-[#1d7f53]"
          role="status"
        >
          You have joined {activePlan.name}. It now shows in your{' '}
          <Link className="font-semibold underline" href="/medi-clinic/portal?tab=medical-aid">
            patient portal
          </Link>
          , along with your documents.
        </p>
      ) : null}
      {cancelled === '1' ? (
        <p
          className="rounded-xl border border-[#e3e5eb] bg-white px-4 py-3 text-sm text-[#727a90]"
          role="status"
        >
          Your plan has been cancelled. Your payment history is still here.
        </p>
      ) : null}

      {tab === 'overview' && state.ready ? (
        state.active && activePlan ? (
          <>
            <section className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#74809a]">Your plan</p>
                  <h2 className="mt-1 text-2xl font-bold">{activePlan.name}</h2>
                  <p className="text-sm text-[#727a90]">{activePlan.tagline}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={state.active.status} />
                  <p className="mt-2 text-2xl font-bold">
                    {formatRand(activePlan.priceMinor)}
                    <span className="text-sm font-normal text-[#727a90]"> / month</span>
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#f7f8fc] p-4">
                  <dt className="text-xs text-[#8b91a3]">Next payment</dt>
                  <dd className="mt-1 font-semibold">{formatDate(state.active.next_debit_on)}</dd>
                </div>
                <div className="rounded-xl bg-[#f7f8fc] p-4">
                  <dt className="text-xs text-[#8b91a3]">Paid from</dt>
                  <dd className="mt-1 font-semibold">
                    {debitCard
                      ? `${debitCard.brand} •••• ${debitCard.last4}`
                      : 'No card selected'}
                  </dd>
                </div>
                <div className="rounded-xl bg-[#f7f8fc] p-4">
                  <dt className="text-xs text-[#8b91a3]">Member since</dt>
                  <dd className="mt-1 font-semibold">{formatDate(state.active.started_at)}</dd>
                </div>
              </dl>

              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                {activePlan.perks.map((perk) => (
                  <li className="flex gap-2" key={perk}>
                    <span className="text-[#0D9488]">✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-[#eff0f4] pt-5">
                <h3 className="font-semibold">Card your plan is paid from</h3>
                <div className="mt-3">
                  {cards.length > 0 ? (
                    <ChangeCardForm cards={cards} currentCardId={state.active.card_id} />
                  ) : (
                    <p className="text-sm text-[#727a90]">
                      No saved cards.{' '}
                      <Link
                        className="font-semibold text-[#0D9488] hover:underline"
                        href="/medical-aid/dashboard?tab=cards"
                      >
                        Add a card
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <CancelPlanForm />
              </div>
            </section>

            {state.payments.length > 0 ? <PaymentsChart payments={state.payments} /> : null}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your documents</h2>
                <Link
                  className="text-sm font-semibold text-[#0D9488] hover:underline"
                  href="/medical-aid/dashboard?tab=documents"
                >
                  View all
                </Link>
              </div>
              <DocumentList planCode={state.active.plan_code} />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent payments</h2>
                <Link
                  className="text-sm font-semibold text-[#0D9488] hover:underline"
                  href="/medical-aid/dashboard?tab=payments"
                >
                  View all
                </Link>
              </div>
              <PaymentsTable limit={3} payments={state.payments} />
            </section>
          </>
        ) : (
          <section className={cardClass}>
            <h2 className="text-xl font-bold">You are not on a care plan yet</h2>
            {state.latest ? (
              <p className="mt-2 text-sm text-[#727a90]">
                Your {getCarePlan(state.latest.plan_code)?.name ?? 'previous'} plan was
                cancelled on {formatDate(state.latest.cancelled_at)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#727a90]">
                Pick a plan, choose the card it is paid from, and it will show here
                and in your patient portal.
              </p>
            )}
            {asked ? (
              <p className="mt-3 rounded-xl bg-[#E6F7F5] px-4 py-3 text-sm text-[#0F766E]">
                You asked about <strong>{asked.name}</strong> ({formatRand(asked.priceMinor)} /
                month).
              </p>
            ) : null}
            <Link
              className="mt-4 inline-block rounded-xl bg-[#0D9488] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E]"
              href={`/medical-aid/dashboard?tab=plans${asked ? `&plan=${asked.code}` : ''}#enrol`}
            >
              {asked ? `Continue with ${asked.name}` : 'Choose a plan'}
            </Link>
          </section>
        )
      ) : null}

      {tab === 'plans' && state.ready ? (
        <>
          <CarePlanCards
          theme="teal"
            buttonLabel={(plan) => `Choose ${plan.name}`}
            currentCode={(state.active?.plan_code as CarePlanCode | undefined) ?? null}
            hrefFor={(plan) => `/medical-aid/dashboard?tab=plans&plan=${plan.code}#enrol`}
            selectedCode={asked?.code}
          />
          <section className={cardClass} id="enrol">
            {state.active && activePlan ? (
              <>
                <h2 className="text-lg font-semibold">You are on {activePlan.name}</h2>
                <p className="mt-2 text-sm text-[#727a90]">
                  To switch plans, cancel your current plan from the Overview
                  first, then choose a new one.
                </p>
              </>
            ) : asked ? (
              <>
                <h2 className="text-lg font-semibold">
                  Join {asked.name} · {formatRand(asked.priceMinor)} / month
                </h2>
                <div className="mt-4">
                  <EnrolForm
                    cards={cards}
                    cardsHref="/medical-aid/dashboard?tab=cards"
                    planCode={asked.code}
                    planName={asked.name}
                    priceLabel={formatRand(asked.priceMinor)}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[#727a90]">
                Choose a plan above to continue.
              </p>
            )}
          </section>
        </>
      ) : null}

      {tab === 'cards' ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Cards for your plan</h2>
          <p className="mt-1 text-sm text-[#727a90]">
            Save the credit cards you want to use. You choose which one your plan
            is paid from when you join, and you can change it later from the
            Overview. Only the card type, last 4 digits and expiry are stored.
          </p>
          <CardWallet cards={cards} />
        </section>
      ) : null}

      {tab === 'payments' && state.ready ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Payment history</h2>
          <PaymentsTable payments={state.payments} />
          <p className="text-xs text-[#9298a8]">
            Demo mode: these payments are sample records and no money has been
            taken from your card.
          </p>
        </section>
      ) : null}

      {tab === 'documents' && state.ready ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your documents</h2>
          {documentsPlan ? (
            <>
              {documentsPlan.status === 'cancelled' ? (
                <p className="text-sm text-[#727a90]">
                  These are from your previous{' '}
                  {getCarePlan(documentsPlan.plan_code)?.name} plan.
                </p>
              ) : null}
              <DocumentList planCode={documentsPlan.plan_code} />
              <p className="text-xs text-[#9298a8]">
                These are sample documents for demonstration.
              </p>
            </>
          ) : (
            <p className={`${cardClass} text-sm text-[#727a90]`}>
              Your membership certificate and benefit guide appear here once you
              join a plan.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
