import { fetchTomorrowAppointments } from '../lib/data';

export default async function TomorrowAppointmentsPage() {
  const appointments = await fetchTomorrowAppointments();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">A quick front-desk view</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Tomorrow’s appointments
        </h1>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
        {appointments.length === 0 ? (
          <p className="p-6 text-sm text-[#7b8296]">
            No booked appointments for tomorrow.
          </p>
        ) : (
          <ul className="divide-y divide-[#eff0f4]">
            {appointments.map((appointment) => (
              <li
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                key={appointment.id}
              >
                <div>
                  <p className="font-semibold">{appointment.patients.full_name}</p>
                  <a
                    className="mt-1 inline-block text-sm text-[#1E4FD8]"
                    href={
                      appointment.patients.phone
                        ? `tel:${appointment.patients.phone}`
                        : undefined
                    }
                  >
                    {appointment.patients.phone || 'No phone number'}
                  </a>
                </div>
                <time className="text-sm font-medium text-[#68718a]">
                  {new Date(appointment.starts_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
