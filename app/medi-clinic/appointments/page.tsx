import { updateClinicAppointment } from '../lib/actions';
import { getClinicAccess } from '../lib/access';
import {
  fetchAppointments,
  fetchClinicAppointmentTypes,
  fetchClinicProviders,
  fetchPatients,
} from '../lib/data';
import CreateAppointmentForm from '../ui/create-appointment-form';

export default async function ClinicAppointmentsPage() {
  const [
    appointments,
    patients,
    providers,
    appointmentTypes,
    { canManageAppointments },
  ] = await Promise.all([
    fetchAppointments(),
    fetchPatients(),
    fetchClinicProviders(),
    fetchClinicAppointmentTypes(),
    getClinicAccess(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Schedule and follow up</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Appointments</h1>
      </div>

      {canManageAppointments && (
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
          <h2 className="font-semibold">Book an appointment</h2>
          {patients.length === 0 ? (
            <p className="mt-3 text-sm text-[#7b8296]">
              Add a patient before booking an appointment.
            </p>
          ) : providers.length === 0 || appointmentTypes.length === 0 ? (
            <p className="mt-3 text-sm text-[#7b8296]">
              An owner must configure an active provider, a weekly shift, and at
              least one appointment type before bookings can be made.
            </p>
          ) : (
            <CreateAppointmentForm
              appointmentTypes={appointmentTypes}
              patients={patients}
              providers={providers}
            />
          )}
        </section>
      )}

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
                  <th className="px-5 py-3 font-medium">Provider & type</th>
                  <th className="px-5 py-3 font-medium">Starts at</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {canManageAppointments && (
                    <th className="px-5 py-3 font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-5 py-4 font-medium">
                      {appointment.patients.full_name}
                    </td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {appointment.clinic_providers?.display_name ?? 'Unassigned'}
                      <span className="block text-xs text-[#9298a8]">
                        {appointment.clinic_appointment_types?.name ??
                          (appointment.duration_minutes
                            ? `${appointment.duration_minutes} minute appointment`
                            : 'Legacy appointment')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                      {formatAppointmentTime(
                        appointment.starts_at,
                        providers.find((provider) => provider.id === appointment.provider_id)
                          ?.time_zone,
                      )}
                    </td>
                    <td className="px-5 py-4 capitalize text-[#727a90]">
                      {appointment.status.replace('_', ' ')}
                    </td>
                    {canManageAppointments && (
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
                          <select
                            aria-label="Provider"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={appointment.provider_id ?? ''}
                            name="provider_id"
                            required
                          >
                            <option value="">Select provider</option>
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.display_name}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Appointment type"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={appointment.appointment_type_id ?? ''}
                            name="appointment_type_id"
                            required
                          >
                            <option value="">Select type</option>
                            {appointmentTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name} ({type.duration_minutes} min)
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label="Date and time"
                            className="rounded-lg border-[#e3e5eb] text-sm"
                            defaultValue={localDateTime(
                              appointment.starts_at,
                              providers.find(
                                (provider) => provider.id === appointment.provider_id,
                              )?.time_zone,
                            )}
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

function formatAppointmentTime(value: string, timeZone?: string) {
  return new Date(value).toLocaleString([], {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function localDateTime(value?: string, timeZone = 'UTC') {
  const date = value ? new Date(value) : new Date();
  const parts = new Map(
    new Intl.DateTimeFormat('en', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}T${parts.get('hour')}:${parts.get('minute')}`;
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
