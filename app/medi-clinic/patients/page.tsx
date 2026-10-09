import {
  archiveClinicPatient,
  createClinicPatient,
  linkClinicPatientAccount,
  updateClinicPatient,
} from '../lib/actions';
import { getClinicAccess } from '../lib/access';
import { fetchPatients } from '../lib/data';

const labelClass = 'block text-xs font-medium text-[#404960]';
const fieldClass = 'mt-1 block w-full rounded-lg border-[#e3e5eb] text-sm';

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

      {canManageAppointments && (
        <details className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
          <summary className="cursor-pointer text-sm font-semibold text-[#1E4FD8]">
            + Add patient
          </summary>
          <form action={createClinicPatient} className="mt-4 grid max-w-md gap-3">
            <label className={labelClass}>
              Full name
              <input
                className={fieldClass}
                name="full_name"
                placeholder="e.g. Jane Smith"
                required
              />
            </label>
            <label className={labelClass}>
              Phone number
              <input
                className={fieldClass}
                name="phone"
                placeholder="e.g. 082 123 4567"
                type="tel"
              />
            </label>
            <label className={labelClass}>
              Date of birth
              <input className={fieldClass} name="date_of_birth" type="date" />
            </label>
            <label className={labelClass}>
              Email address
              <input
                className={fieldClass}
                name="email"
                placeholder="e.g. jane@example.com"
                type="email"
              />
            </label>
            <button className="rounded-lg bg-[#1E4FD8] px-3 py-2 text-sm font-semibold text-white">
              Add patient
            </button>
          </form>
        </details>
      )}

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
                          <summary className="cursor-pointer font-medium text-[#1E4FD8]">
                            Edit
                          </summary>
                          <form
                            action={updateClinicPatient.bind(null, patient.id)}
                            className="mt-3 grid gap-3"
                          >
                            <label className={labelClass}>
                              Full name
                              <input
                                className={fieldClass}
                                defaultValue={patient.full_name}
                                name="full_name"
                                placeholder="e.g. Jane Smith"
                                required
                              />
                            </label>
                            <label className={labelClass}>
                              Phone number
                              <input
                                className={fieldClass}
                                defaultValue={patient.phone ?? ''}
                                name="phone"
                                placeholder="e.g. 082 123 4567"
                                type="tel"
                              />
                            </label>
                            <label className={labelClass}>
                              Date of birth
                              <input
                                className={fieldClass}
                                defaultValue={patient.date_of_birth ?? ''}
                                name="date_of_birth"
                                type="date"
                              />
                            </label>
                            <label className={labelClass}>
                              Email address
                              <input
                                className={fieldClass}
                                defaultValue={patient.email ?? ''}
                                name="email"
                                placeholder="e.g. jane@example.com"
                                type="email"
                              />
                            </label>
                            <button className="rounded-lg bg-[#1E4FD8] px-3 py-2 text-sm font-semibold text-white">
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
                            <button className="text-left text-sm font-medium text-[#1E4FD8]">
                              Link patient portal account
                            </button>
                          </form>
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
