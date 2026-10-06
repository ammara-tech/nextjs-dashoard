import {
  deleteClinicAppointment,
  updateClinicAppointment,
} from '../lib/actions';
import { getClinicAccess } from '../lib/access';
import { fetchAppointments, fetchPatients } from '../lib/data';
import CreateAppointmentForm from '../ui/create-appointment-form';

export default async function ClinicAppointmentsPage() {
  const [appointments, patients, { isOwner }] = await Promise.all([
    fetchAppointments(),
    fetchPatients(),
    getClinicAccess(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Schedule and follow up</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Appointments</h1>
      </div>

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        <h2 className="font-semibold">Book an appointment</h2>
        {patients.length === 0 ? (
          <p className="mt-3 text-sm text-[#7b8296]">
            Add a patient before booking an appointment.
          </p>
        ) : (
          <CreateAppointmentForm patients={patients} />
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        <div className="border-b border-[#eff0f4] px-5 py-4">
          <h2 className="font-semibold">Appointment records</h2>
        </div>
        {appointments.length === 0 ? (
          <p className="p-6 text-sm text-[#7b8296]">No appointments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafbfe] text-xs uppercase tracking-wide text-[#8b91a3]">
                <tr>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Starts at</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-5 py-4 font-medium">
                      {appointment.patients.full_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                      {new Date(appointment.starts_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 capitalize text-[#727a90]">
                      {appointment.status.replace('_', ' ')}
                    </td>
                    <td className="min-w-72 px-5 py-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-[#6077ed]">
                          Edit
                        </summary>
                        <form
                          action={updateClinicAppointment.bind(
                            null,
                            appointment.id,
                          )}
                          className="mt-3 grid gap-2"
                        >
                          <select
                            aria-label="Patient"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={appointment.patient_id}
                            name="patient_id"
                            required
                          >
                            {patients.map((patient) => (
                              <option key={patient.id} value={patient.id}>
                                {patient.full_name}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label="Date and time"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={localDateTime(appointment.starts_at)}
                            name="starts_at"
                            required
                            type="datetime-local"
                          />
                          <select
                            aria-label="Status"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={appointment.status}
                            name="status"
                          >
                            <StatusOptions />
                          </select>
                          <button className="rounded-lg bg-[#647cf5] px-3 py-2 text-sm font-semibold text-white">
                            Save changes
                          </button>
                        </form>
                      </details>
                      {isOwner && (
                        <form
                          action={deleteClinicAppointment.bind(
                            null,
                            appointment.id,
                          )}
                          className="mt-2"
                        >
                          <button className="text-sm font-medium text-red-600">
                            Delete
                          </button>
                        </form>
                      )}
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

function localDateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function StatusOptions() {
  return (
    <>
      <option value="booked">Booked</option>
      <option value="done">Done</option>
      <option value="no_show">No-show</option>
    </>
  );
}
