import {
  archiveClinicPatient,
  linkClinicPatientAccount,
  updateClinicPatient,
} from '../lib/actions';
import { getClinicAccess } from '../lib/access';
import { fetchPatients } from '../lib/data';

export default async function ClinicPatientsPage() {
  const [patients, { isOwner, canManageAppointments, role }] = await Promise.all([
    fetchPatients(),
    getClinicAccess(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        description={
          role === 'doctor'
            ? 'Patients linked to your provider schedule.'
            : 'Keep patient contact details up to date.'
        }
        title={role === 'doctor' ? 'My patients' : 'Patients'}
      />

      <section className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        <div className="border-b border-[#eff0f4] px-5 py-4">
          <h2 className="font-semibold">Patient records</h2>
        </div>
        {patients.length === 0 ? (
          <p className="p-6 text-sm text-[#7b8296]">No patients have been added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafbfe] text-xs uppercase tracking-wide text-[#8b91a3]">
                <tr>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Date of birth</th>
                  <th className="px-5 py-3 font-medium">Patient number</th>
                  {canManageAppointments && (
                    <th className="px-5 py-3 font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-5 py-4 font-medium">{patient.full_name}</td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {patient.phone || '—'}
                    </td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {patient.date_of_birth || '—'}
                    </td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {patient.patient_number || '—'}
                    </td>
                    {canManageAppointments && (
                      <td className="min-w-72 px-5 py-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-[#6077ed]">
                          Edit
                        </summary>
                        <form
                          action={updateClinicPatient.bind(null, patient.id)}
                          className="mt-3 grid gap-2"
                        >
                          <input
                            aria-label="Full name"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={patient.full_name}
                            name="full_name"
                            required
                          />
                          <input
                            aria-label="Phone"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={patient.phone ?? ''}
                            name="phone"
                            type="tel"
                          />
                          <input
                            aria-label="Date of birth"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={patient.date_of_birth ?? ''}
                            name="date_of_birth"
                            type="date"
                          />
                          <input
                            aria-label="Email"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={patient.email ?? ''}
                            name="email"
                            type="email"
                          />
                          <button className="rounded-lg bg-[#647cf5] px-3 py-2 text-sm font-semibold text-white">
                            Save changes
                          </button>
                        </form>
                        {(isOwner || role === 'admin') && (
                          <form
                            action={archiveClinicPatient.bind(null, patient.id)}
                            className="mt-3 border-t border-[#eff0f4] pt-3"
                          >
                            <p className="mb-2 text-xs text-[#727a90]">
                              Archiving removes this patient from active records
                              while preserving their clinical history.
                            </p>
                            <button className="text-sm font-semibold text-red-600">
                              Archive patient
                            </button>
                          </form>
                        )}
                      </details>
                      {isOwner && (
                        <>
                          <form
                            action={linkClinicPatientAccount.bind(null, patient.id)}
                            className="mt-3 grid gap-2"
                          >
                            <label className="text-xs text-[#727a90]">
                              Linked Supabase Auth user UUID
                              <input
                                className="mt-1 w-full rounded-lg border-[#e3e5eb] text-xs"
                                defaultValue={patient.auth_user_id ?? ''}
                                name="auth_user_id"
                                placeholder="UUID from the verified patient account"
                                required
                              />
                            </label>
                            <button className="text-left text-sm font-medium text-[#6077ed]">
                              Link patient portal account
                            </button>
                          </form>
                        </>
                      )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PageHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-sm text-[#74809a]">{description}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
