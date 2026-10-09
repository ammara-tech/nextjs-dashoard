import Link from 'next/link';
import { requireClinicRole } from '../lib/access';
import { createClinicSupportRequest } from '../lib/actions';
import {
  fetchClinicAppointmentTypes,
  fetchClinicProviders,
} from '../lib/data';
import CreateAppointmentForm from '../ui/create-appointment-form';
import CardWallet, { type SavedCard } from '../ui/card-wallet';
import MedicalAidPanel from '../ui/medical-aid-panel';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'medical-aid', label: 'Medical aid' },
  { id: 'plans', label: 'Family Care Plans' },
  { id: 'documents', label: 'Documents' },
  { id: 'payments', label: 'Payments' },
  { id: 'support', label: 'Support' },
] as const;

export default async function PatientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: requestedTab } = await searchParams;
  const tab = tabs.some((t) => t.id === requestedTab)
    ? (requestedTab as string)
    : 'overview';
  const { supabase, user } = await requireClinicRole(['patient']);
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, full_name, phone, date_of_birth, email, patient_number')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (patientError) {
    console.error('Supabase patient portal profile error:', patientError);
    throw new Error('Unable to load your patient profile.');
  }
  if (!patient) {
    return (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6">
        <h1 className="text-2xl font-bold">Patient account not linked</h1>
        <p className="mt-2 text-sm text-[#727a90]">
          Contact the clinic reception team to securely link this sign-in to
          your patient record.
        </p>
      </section>
    );
  }

  const [providers, appointmentTypes] = await Promise.all([
    fetchClinicProviders(),
    fetchClinicAppointmentTypes(),
  ]);
  // Missing migration must not take down the portal; the panel shows a notice.
  const [aidProvidersResult, aidProfileResult] = await Promise.all([
    supabase.from('medical_aid_providers').select('id, name, plans').order('name'),
    supabase
      .from('patient_insurance_profiles')
      .select('provider_id, plan, member_id_last4, dependent_label, status, card_object_path')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (aidProvidersResult.error) {
    console.error('Medical aid providers error:', aidProvidersResult.error);
  }
  if (aidProfileResult.error) {
    console.error('Medical aid profile error:', aidProfileResult.error);
  }
  const [
    appointmentsResult,
    documentsResult,
    paymentsResult,
    walletResult,
    prescriptionsResult,
    cardsResult,
  ] =
    await Promise.all([
      supabase
        .from('appointments')
        .select(
          'id, starts_at, status, duration_minutes, clinic_providers(display_name), clinic_appointment_types(name)',
        )
        .order('starts_at', { ascending: false })
        .limit(25),
      supabase
        .from('clinic_patient_documents')
        .select('id, object_path, category, original_name, content_type, created_at')
        .eq('patient_id', patient.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('clinic_payments')
        .select('id, amount_minor, currency, method, status, created_at')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('clinic_wallet_entries')
        .select('amount_minor')
        .eq('patient_id', patient.id),
      supabase
        .from('clinic_prescriptions')
        .select('id, medication, instructions, status, created_at')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('clinic_saved_cards')
        .select(
          'id, cardholder_name, brand, last4, exp_month, exp_year, nickname, is_default',
        )
        .order('created_at', { ascending: true }),
    ]);

  if (cardsResult.error) {
    console.error('Saved cards error:', cardsResult.error);
  }

  for (const [label, error] of [
    ['appointments', appointmentsResult.error],
    ['documents', documentsResult.error],
    ['payments', paymentsResult.error],
    ['wallet', walletResult.error],
    ['prescriptions', prescriptionsResult.error],
  ] as const) {
    if (error) {
      console.error(`Supabase patient portal ${label} error:`, error);
      throw new Error(`Unable to load your ${label}.`);
    }
  }

  const documents = await Promise.all(
    (documentsResult.data ?? []).map(async (document) => {
      const { data, error } = await supabase.storage
        .from('patients-medical-records')
        .createSignedUrl(document.object_path, 900);
      if (error) {
        console.error('Supabase patient document signed URL error:', error);
        return { ...document, url: null };
      }
      return { ...document, url: data.signedUrl };
    }),
  );
  const walletBalance = (walletResult.data ?? []).reduce(
    (sum, entry) => sum + entry.amount_minor,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Your secure clinic account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Welcome, {patient.full_name}
        </h1>
      </div>

      <nav
        aria-label="Patient portal sections"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e9eaf0] bg-white p-1.5 shadow-sm"
      >
        {tabs.map((t) => (
          <Link
            aria-current={tab === t.id ? 'page' : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[#1E2F66] text-white'
                : 'text-[#727a90] hover:bg-[#EEF2FF] hover:text-[#1E2F66]'
            }`}
            href={`/medi-clinic/portal?tab=${t.id}`}
            key={t.id}
            scroll={false}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              accent="bg-[#1E4FD8]"
              hint={`${(appointmentsResult.data ?? []).length} on record`}
              label="Appointments"
              tabId="appointments"
              value={String(
                (appointmentsResult.data ?? []).filter(
                  (a) => new Date(a.starts_at) > new Date(),
                ).length,
              )}
              suffix="upcoming"
            />
            <StatCard
              accent="bg-[#5B7FFF]"
              hint="Active medications"
              label="Prescriptions"
              tabId="prescriptions"
              value={String((prescriptionsResult.data ?? []).length)}
            />
            <StatCard
              accent="bg-[#1E2F66]"
              hint={
                aidProfileResult.data ? 'Medical aid on file' : 'No medical aid yet'
              }
              label="Medical aid"
              tabId="medical-aid"
              value={aidProfileResult.data ? 'Active' : 'None'}
            />
            <StatCard
              accent="bg-[#9CC9FF]"
              hint="Recorded clinic credit"
              label="Wallet"
              tabId="payments"
              value={(walletBalance / 100).toFixed(2)}
            />
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Patient number" value={patient.patient_number ?? 'Not assigned'} />
            <InfoCard label="Email" value={patient.email ?? user.email ?? 'Not on file'} />
            <InfoCard label="Phone" value={patient.phone ?? 'Not on file'} />
            <InfoCard label="Date of birth" value={patient.date_of_birth ?? 'Not on file'} />
          </section>
          <FamilyCarePromo />
        </>
      )}

      {tab === 'plans' && <FamilyCarePlans />}

      {tab === 'medical-aid' && (
        <MedicalAidPanel
          patientName={patient.full_name}
          providers={aidProvidersResult.data ?? []}
          profile={aidProfileResult.data ?? null}
        />
      )}

      {tab === 'appointments' && (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Book an appointment</h2>
        {providers.length === 0 || appointmentTypes.length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">
            The clinic is still setting up its online schedule. Please contact
            the clinic to book for now.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-[#727a90]">
              Choose an appointment time in the provider’s time zone. The
              booking is confirmed only if that slot is still available.
            </p>
            <CreateAppointmentForm
              appointmentTypes={appointmentTypes}
              patientId={patient.id}
              patients={[]}
              providers={providers}
            />
          </>
        )}
      </section>
      )}

      {tab === 'prescriptions' && (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Prescriptions</h2>
        {(prescriptionsResult.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">No prescriptions are available.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#eff0f4]">
            {(prescriptionsResult.data ?? []).map((prescription) => (
              <li className="py-3" key={prescription.id}>
                <p className="font-medium">{prescription.medication}</p>
                <p className="text-sm text-[#727a90]">{prescription.instructions}</p>
                <p className="mt-1 text-xs capitalize text-[#9298a8]">
                  {prescription.status} · {new Date(prescription.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab === 'appointments' && (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Appointments</h2>
        {(appointmentsResult.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">No appointments are linked to your account.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#eff0f4]">
            {(appointmentsResult.data ?? []).map((appointment) => (
              <li className="flex flex-wrap justify-between gap-2 py-3" key={appointment.id}>
                <div>
                  <p className="font-medium">
                    {appointment.clinic_appointment_types[0]?.name ?? 'Clinic appointment'}
                  </p>
                  <p className="text-sm text-[#727a90]">
                    {appointment.clinic_providers[0]?.display_name ?? 'Provider to be confirmed'}
                  </p>
                </div>
                <div className="text-right">
                  <time className="block text-sm">
                    {new Date(appointment.starts_at).toLocaleString()}
                  </time>
                  <span className="text-xs capitalize text-[#727a90]">
                    {appointment.status.replace('_', ' ')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab === 'documents' && (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">My documents</h2>
        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">No documents are available.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#eff0f4]">
            {documents.map((document) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={document.id}>
                <div>
                  <p className="font-medium">{document.original_name}</p>
                  <p className="text-xs capitalize text-[#9298a8]">
                    {document.category.replace('_', ' ')} ·{' '}
                    {new Date(document.created_at).toLocaleDateString()}
                  </p>
                </div>
                {document.url ? (
                  <a
                    className="text-sm font-semibold text-[#1E4FD8]"
                    href={document.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open securely
                  </a>
                ) : (
                  <span className="text-sm text-[#727a90]">Temporarily unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab === 'payments' && (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Payments and clinic credit</h2>
        <p className="mt-2 text-sm text-[#727a90]">
          Recorded clinic credit: {(walletBalance / 100).toFixed(2)}{' '}
          {(paymentsResult.data?.[0]?.currency ?? '').toUpperCase()}
        </p>
        {(paymentsResult.data ?? []).length > 0 && (
          <ul className="mt-3 divide-y divide-[#eff0f4]">
            {(paymentsResult.data ?? []).map((payment) => (
              <li className="flex justify-between gap-3 py-3 text-sm" key={payment.id}>
                <span>
                  {payment.method.replace('_', ' ')} · {payment.status.replace('_', ' ')}
                </span>
                <span>
                  {(payment.amount_minor / 100).toFixed(2)} {payment.currency.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab === 'payments' && (
        <CardWallet cards={(cardsResult.data ?? []) as SavedCard[]} />
      )}

      {tab === 'support' && (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Contact clinic support</h2>
        <p className="mt-2 text-sm text-[#727a90]">
          For non-urgent account questions, send a message to the clinic team.
          Do not use this form for emergencies or urgent symptoms.
        </p>
        <form action={createClinicSupportRequest} className="mt-4 grid gap-3">
          <label className="text-sm text-[#727a90]">
            Subject
            <input className={inputClass} maxLength={160} name="subject" required />
          </label>
          <label className="text-sm text-[#727a90]">
            Message
            <textarea className={inputClass} maxLength={4000} name="message" required rows={4} />
          </label>
          <button className={buttonClass}>Send request</button>
        </form>
      </section>
      )}

      <p className="text-xs text-[#9298a8]">
        This portal is for routine account information. It is not monitored for
        urgent or emergency care.
      </p>
    </div>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66]';

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
      <p className="text-sm text-[#74809a]">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function StatCard({
  accent,
  hint,
  label,
  suffix,
  tabId,
  value,
}: {
  accent: string;
  hint: string;
  label: string;
  suffix?: string;
  tabId: string;
  value: string;
}) {
  return (
    <Link
      className="group relative overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      href={`/medi-clinic/portal?tab=${tabId}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />
      <p className="text-sm font-medium text-[#74809a]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#1E2F66]">
        {value}
        {suffix && (
          <span className="ml-1.5 text-sm font-medium text-[#74809a]">{suffix}</span>
        )}
      </p>
      <p className="mt-1 text-xs text-[#9298a8]">{hint}</p>
    </Link>
  );
}

const plans = [
  {
    name: 'Essential',
    tagline: 'Everyday care for one person',
    price: 'R199',
    featured: false,
    perks: [
      '2 discounted GP consultations a month',
      'Annual wellness check-up included',
      '10% off clinic pharmacy items',
      'Online booking and records',
    ],
  },
  {
    name: 'Family Plus',
    tagline: 'Cover for the whole household',
    price: 'R549',
    featured: true,
    perks: [
      'Up to 2 adults and 4 children',
      'Unlimited discounted consultations',
      'Free child immunisation visits',
      'Priority same-day booking',
      '20% off pharmacy and treatments',
    ],
  },
  {
    name: 'Premium',
    tagline: 'Full-service care and extras',
    price: 'R899',
    featured: false,
    perks: [
      'Everything in Family Plus',
      'Dental and optical benefits',
      'Chronic medication management',
      'Dedicated care coordinator',
      'Free specialist referral letters',
    ],
  },
];

function FamilyCarePromo() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-6 text-white shadow-sm sm:p-8">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#1E4FD8]/40 blur-2xl" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9CC9FF]">
          Family Clinic Care Plans
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          Our own medical aid, built for your family
        </h2>
        <p className="mt-2 text-sm text-[#C7D4FF]">
          Save on consultations, medication and check-ups with a plan that
          grows with you. No long contracts, cancel any time.
        </p>
        <Link
          className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#1E2F66] hover:bg-[#EEF2FF]"
          href="/medi-clinic/portal?tab=plans"
        >
          Learn more about our plans
        </Link>
      </div>
    </section>
  );
}

function FamilyCarePlans() {
  return (
    <section className="rounded-2xl bg-[#0F172A] p-6 text-white shadow-sm sm:p-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Plans that grow with you</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#C7D4FF]">
          Family Clinic Care Plans give you perks you will actually use.
          Choose the one that fits your household.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            className={`flex flex-col rounded-2xl border p-6 ${
              plan.featured
                ? 'border-[#5B7FFF] bg-[#1E2F66]'
                : 'border-white/10 bg-white/5'
            }`}
            key={plan.name}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              {plan.featured && (
                <span className="rounded-full bg-[#5B7FFF] px-2.5 py-0.5 text-xs font-semibold">
                  Most popular
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#C7D4FF]">{plan.tagline}</p>
            <p className="mt-5 text-4xl font-bold">
              {plan.price}
              <span className="text-sm font-normal text-[#C7D4FF]"> / month</span>
            </p>
            <Link
              className={`mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                plan.featured
                  ? 'bg-white text-[#1E2F66] hover:bg-[#EEF2FF]'
                  : 'bg-[#1E4FD8] text-white hover:bg-[#2b4190]'
              }`}
              href="/medi-clinic/portal?tab=support"
            >
              Enquire about {plan.name}
            </Link>
            <p className="mt-2 text-center text-xs text-[#9CC9FF]">
              No commitment · Cancel anytime
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {plan.perks.map((perk) => (
                <li className="flex gap-2" key={perk}>
                  <span className="text-[#9CC9FF]">✓</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-[#9CC9FF]">
        Plan prices and benefits are illustrative. Final terms are confirmed by
        the clinic.
      </p>
    </section>
  );
}
