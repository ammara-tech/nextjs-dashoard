import type { Appointment } from '../lib/data';
import type { DoctorOption } from '../lib/demo-data';
import { formatClock, formatDay, SampleBanner, StatusPill } from './doctor-dashboard';

type AppointmentSchedule = {
  appointments: Appointment[];
  sampleAppointments: boolean;
};

const cardClass =
  'overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white shadow-[0_8px_30px_rgba(31,41,55,0.04)]';
const headClass = 'bg-[#fafbfe] text-xs uppercase tracking-wide text-[#8b91a3]';

function Heading({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div>
      <p className="text-sm text-[#74809a]">{subtitle}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}

export function DoctorAppointmentsView({
  doctor,
  schedule,
}: {
  doctor: DoctorOption;
  schedule: AppointmentSchedule;
}) {
  const timeZone = doctor.time_zone || 'Africa/Johannesburg';
  const rows = [...schedule.appointments].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );

  return (
    <div className="space-y-6">
      <Heading subtitle={doctor.display_name} title="My appointments" />
      {schedule.sampleAppointments ? (
        <SampleBanner>
          Showing sample appointments for {doctor.display_name}. Real bookings appear
          here once they are assigned to this doctor.
        </SampleBanner>
      ) : null}
      <section className={cardClass}>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[#7b8296]">No appointments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className={headClass}>
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {rows.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                      {formatDay(appointment.starts_at, timeZone)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium">
                      {formatClock(appointment.starts_at, timeZone)}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {appointment.patients.full_name}
                      <span className="block text-xs font-normal text-[#9298a8]">
                        {appointment.patients.phone ?? 'No phone number'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#727a90]">
                      {appointment.clinic_appointment_types?.name ?? 'Appointment'}
                      {appointment.duration_minutes
                        ? ` · ${appointment.duration_minutes} min`
                        : ''}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={appointment.status} />
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

export function DoctorPatientsView({
  doctor,
  schedule,
}: {
  doctor: DoctorOption;
  schedule: AppointmentSchedule;
}) {
  const timeZone = doctor.time_zone || 'Africa/Johannesburg';
  const nowIso = new Date().toISOString();
  const byPatient = new Map<
    string,
    { id: string; name: string; phone: string | null; visits: number; next: string | null }
  >();
  for (const appointment of schedule.appointments) {
    const entry = byPatient.get(appointment.patient_id) ?? {
      id: appointment.patient_id,
      name: appointment.patients.full_name,
      phone: appointment.patients.phone,
      visits: 0,
      next: null,
    };
    entry.visits += 1;
    if (
      appointment.status === 'booked' &&
      appointment.starts_at >= nowIso &&
      (entry.next === null || appointment.starts_at < entry.next)
    ) {
      entry.next = appointment.starts_at;
    }
    byPatient.set(appointment.patient_id, entry);
  }
  const patients = Array.from(byPatient.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <Heading subtitle={`Patients on ${doctor.display_name}’s schedule`} title="My patients" />
      {schedule.sampleAppointments ? (
        <SampleBanner>
          Showing sample patients for {doctor.display_name}. Real patients appear here
          once they have appointments with this doctor.
        </SampleBanner>
      ) : null}
      <section className={cardClass}>
        {patients.length === 0 ? (
          <p className="p-6 text-sm text-[#7b8296]">No patients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className={headClass}>
                <tr>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Visits</th>
                  <th className="px-5 py-3 font-medium">Next visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-5 py-4 font-medium">{patient.name}</td>
                    <td className="px-5 py-4 text-[#727a90]">{patient.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-[#727a90]">{patient.visits}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#727a90]">
                      {patient.next
                        ? `${formatDay(patient.next, timeZone)} ${formatClock(patient.next, timeZone)}`
                        : 'None booked'}
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
