import {
  createTreatment,
  updateTreatment,
} from '../lib/actions';
import { requireClinicOwner } from '../lib/access';
import { fetchAppointments, fetchTreatments } from '../lib/data';

export default async function ClinicTreatmentsPage() {
  await requireClinicOwner();
  const [appointments, treatments] = await Promise.all([
    fetchAppointments(),
    fetchTreatments(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Owner-only records</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Treatments</h1>
      </div>
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        <h2 className="font-semibold">Record a treatment</h2>
        {appointments.length === 0 ? (
          <p className="mt-3 text-sm text-[#7b8296]">
            Add an appointment before recording a treatment.
          </p>
        ) : (
          <form action={createTreatment} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-[#727a90]">
              Appointment
              <select
                className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
                name="appointment_id"
                required
              >
                <option value="">Select appointment</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.patients.full_name} —{' '}
                    {new Date(appointment.starts_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#727a90]">
              Procedure
              <input
                className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
                name="procedure"
                required
              />
            </label>
            <label className="text-sm text-[#727a90]">
              Fee (cents)
              <input
                className="mt-1 block w-full rounded-xl border-[#e3e5eb]"
                min="0"
                name="fee_cents"
                required
                type="number"
              />
            </label>
            <div className="flex items-end">
              <button className="w-full rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66]">
                Save treatment
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        {treatments.length === 0 ? (
          <p className="p-6 text-sm text-[#7b8296]">No treatments have been recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafbfe] text-xs uppercase tracking-wide text-[#8b91a3]">
                <tr>
                  <th className="px-5 py-3 font-medium">Procedure</th>
                  <th className="px-5 py-3 font-medium">Fee</th>
                  <th className="px-5 py-3 font-medium">Appointment</th>
                  <th className="px-5 py-3 font-medium">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {treatments.map((treatment) => (
                  <tr key={treatment.id}>
                    <td className="px-5 py-4 font-medium">{treatment.procedure}</td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {(treatment.fee_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {appointments.find(
                        (appointment) =>
                          appointment.id === treatment.appointment_id,
                      )?.patients.full_name ?? 'Appointment'}
                    </td>
                    <td className="min-w-72 px-5 py-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-[#1E4FD8]">
                          Edit
                        </summary>
                        <form
                          action={updateTreatment.bind(null, treatment.id)}
                          className="mt-3 grid gap-2"
                        >
                          <select
                            aria-label="Appointment"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={treatment.appointment_id}
                            name="appointment_id"
                            required
                          >
                            {appointments.map((appointment) => (
                              <option key={appointment.id} value={appointment.id}>
                                {appointment.patients.full_name} —{' '}
                                {new Date(appointment.starts_at).toLocaleString()}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label="Procedure"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={treatment.procedure}
                            name="procedure"
                            required
                          />
                          <input
                            aria-label="Fee in cents"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={treatment.fee_cents}
                            min="0"
                            name="fee_cents"
                            required
                            type="number"
                          />
                          <button className="rounded-lg bg-[#1E4FD8] px-3 py-2 text-sm font-semibold text-white">
                            Save changes
                          </button>
                        </form>
                      </details>
                    </td>
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
