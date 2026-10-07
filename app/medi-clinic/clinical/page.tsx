import {
  addClinicalAddendum,
  createClinicEncounter,
  issueClinicPrescription,
  signClinicEncounter,
} from '../lib/actions';
import { requireClinicRole } from '../lib/access';

export default async function ClinicalPage() {
  const { supabase, role } = await requireClinicRole(['owner', 'admin', 'doctor']);
  const [encountersResult, appointmentsResult, prescriptionsResult] =
    await Promise.all([
      supabase
        .from('clinic_encounters')
        .select(
          'id, patient_id, appointment_id, provider_id, status, created_at, signed_at, clinic_encounter_notes(id, note_type, body, created_at)',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      role === 'doctor'
        ? supabase
            .from('appointments')
            .select('id, starts_at, patients!inner(full_name)')
            .eq('status', 'booked')
            .order('starts_at')
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('clinic_prescriptions')
        .select('id, encounter_id, patient_id, medication, instructions, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

  for (const [label, error] of [
    ['encounters', encountersResult.error],
    ['appointments', appointmentsResult.error],
    ['prescriptions', prescriptionsResult.error],
  ] as const) {
    if (error) {
      console.error(`Supabase clinical ${label} error:`, error);
      throw new Error(`Unable to load ${label}.`);
    }
  }

  const patientIds = Array.from(
    new Set([
      ...(encountersResult.data ?? []).map((encounter) => encounter.patient_id),
      ...(prescriptionsResult.data ?? []).map((prescription) => prescription.patient_id),
    ]),
  );
  const patientsResult = patientIds.length
    ? await supabase.from('patients').select('id, full_name').in('id', patientIds)
    : { data: [], error: null };
  if (patientsResult.error) {
    console.error('Supabase clinical patient lookup error:', patientsResult.error);
    throw new Error('Unable to load clinical patient names.');
  }
  const patientName = (id: string) =>
    patientsResult.data?.find((patient) => patient.id === id)?.full_name ?? 'Patient';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Restricted clinical records</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Clinical encounters</h1>
      </div>

      {role === 'doctor' && (appointmentsResult.data ?? []).length > 0 && (
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
          <h2 className="font-semibold">Start an encounter</h2>
          <form action={createClinicEncounter} className="mt-4 grid gap-3">
            <label className="text-sm text-[#727a90]">
              Assigned appointment
              <select className={inputClass} name="appointment_id" required>
                <option value="">Select appointment</option>
                {(appointmentsResult.data ?? []).map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.patients[0]?.full_name ?? 'Patient'} —{' '}
                    {new Date(appointment.starts_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#727a90]">
              Clinical note draft
              <textarea className={inputClass} maxLength={20000} minLength={1} name="note" required rows={5} />
            </label>
            <button className={buttonClass}>Save draft</button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        {(encountersResult.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-[#e9eaf0] bg-white p-5 text-sm text-[#727a90]">
            No encounters are available.
          </div>
        ) : (
          (encountersResult.data ?? []).map((encounter) => (
            <article className="rounded-2xl border border-[#e9eaf0] bg-white p-5" key={encounter.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{patientName(encounter.patient_id)}</h2>
                  <p className="text-sm text-[#727a90]">
                    {new Date(encounter.created_at).toLocaleString()}
                    {' · '}<span className="capitalize">{encounter.status}</span>
                    {encounter.signed_at
                      ? ` · signed ${new Date(encounter.signed_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
              </div>
              <ol className="mt-4 space-y-3">
                {encounter.clinic_encounter_notes.map((note) => (
                  <li className="rounded-xl bg-[#f7f8fc] p-4" key={note.id}>
                    <p className="text-xs uppercase text-[#8b91a3]">
                      {note.note_type} · {new Date(note.created_at).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
                  </li>
                ))}
              </ol>
              {role === 'doctor' && encounter.status === 'draft' && (
                <form action={signClinicEncounter} className="mt-4 grid gap-3">
                  <input name="encounter_id" type="hidden" value={encounter.id} />
                  <label className="text-sm text-[#727a90]">
                    Optional final note before signing
                    <textarea className={inputClass} maxLength={20000} name="note" rows={3} />
                  </label>
                  <button className={buttonClass}>Sign and lock encounter</button>
                </form>
              )}
              {role === 'doctor' && encounter.status === 'signed' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <form action={addClinicalAddendum} className="grid gap-2">
                    <input name="encounter_id" type="hidden" value={encounter.id} />
                    <label className="text-sm text-[#727a90]">
                      Addendum
                      <textarea className={inputClass} maxLength={20000} name="body" required rows={3} />
                    </label>
                    <button className={buttonClass}>Append addendum</button>
                  </form>
                  <form action={issueClinicPrescription} className="grid gap-2">
                    <input name="encounter_id" type="hidden" value={encounter.id} />
                    <label className="text-sm text-[#727a90]">
                      Medication
                      <input className={inputClass} maxLength={200} name="medication" required />
                    </label>
                    <label className="text-sm text-[#727a90]">
                      Instructions
                      <textarea className={inputClass} maxLength={2000} name="instructions" required rows={2} />
                    </label>
                    <button className={buttonClass}>Issue prescription</button>
                  </form>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
        <h2 className="font-semibold">Prescription history</h2>
        {(prescriptionsResult.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">No prescriptions recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#eff0f4]">
            {(prescriptionsResult.data ?? []).map((prescription) => (
              <li className="py-3" key={prescription.id}>
                <p className="font-medium">{patientName(prescription.patient_id)} — {prescription.medication}</p>
                <p className="text-sm text-[#727a90]">{prescription.instructions}</p>
                <p className="mt-1 text-xs capitalize text-[#9298a8]">{prescription.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-[#9298a8]">
        Encounter entries cannot be edited after signature. Corrections must be
        appended as addenda; this workflow does not replace clinical review.
      </p>
    </div>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526be8]';
