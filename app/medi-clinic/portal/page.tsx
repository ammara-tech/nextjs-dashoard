import { requireClinicRole } from '../lib/access';
import { createClinicSupportRequest } from '../lib/actions';
import {
  fetchClinicAppointmentTypes,
  fetchClinicProviders,
} from '../lib/data';
import CreateAppointmentForm from '../ui/create-appointment-form';

export default async function PatientPortalPage() {
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
  const [
    appointmentsResult,
    documentsResult,
    paymentsResult,
    walletResult,
    prescriptionsResult,
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
    ]);

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

      <section className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Patient number" value={patient.patient_number ?? 'Not assigned'} />
        <InfoCard label="Email" value={patient.email ?? user.email ?? 'Not on file'} />
        <InfoCard label="Phone" value={patient.phone ?? 'Not on file'} />
        <InfoCard label="Date of birth" value={patient.date_of_birth ?? 'Not on file'} />
      </section>

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
        <h2 className="text-lg font-semibold">Book an appointment</h2>
        {providers.length === 0 || appointmentTypes.length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">
            Online booking is not configured. Please contact the clinic.
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

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
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

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
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

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
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
                    className="text-sm font-semibold text-[#6077ed]"
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

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
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

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
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

      <p className="text-xs text-[#9298a8]">
        This portal is for routine account information. It is not monitored for
        urgent or emergency care.
      </p>
    </div>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526be8]';

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
      <p className="text-sm text-[#74809a]">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
