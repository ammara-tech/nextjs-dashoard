import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  fetchClinicProviders,
  fetchDoctorAppointments,
  fetchDoctorShifts,
  type Appointment,
  type ProviderShift,
} from './data';
import { DOCTOR_COOKIE } from './doctor-cookie';
import {
  demoAppointments,
  demoDoctors,
  demoShifts,
  type DoctorOption,
} from './demo-data';

export type { DoctorOption };

/** Every doctor a signed-in doctor account can choose from. */
export async function getDoctorOptions(): Promise<{
  doctors: DoctorOption[];
  isDemo: boolean;
}> {
  try {
    const providers = await fetchClinicProviders();
    if (providers.length > 0) {
      return {
        doctors: providers.map((provider) => ({
          id: provider.id,
          display_name: provider.display_name,
          specialty: provider.specialty,
          time_zone: provider.time_zone,
        })),
        isDemo: false,
      };
    }
  } catch (error) {
    console.error('Unable to load doctors for the picker:', error);
  }
  return { doctors: demoDoctors, isDemo: true };
}

/** The doctor chosen in the pop-up, or null until one has been picked. */
export async function getSelectedDoctor() {
  const { doctors, isDemo } = await getDoctorOptions();
  const selectedId = (await cookies()).get(DOCTOR_COOKIE)?.value;
  const selected = doctors.find((doctor) => doctor.id === selectedId) ?? null;
  return { doctors, isDemo, selected };
}

/**
 * For pages that only make sense for one chosen doctor: sends the person back
 * to the overview (where the doctor pop-up opens) until a doctor is picked.
 */
export async function requireSelectedDoctor() {
  const { doctors, isDemo, selected } = await getSelectedDoctor();
  if (!selected) redirect('/medi-clinic');
  return { doctors, isDemo, selected };
}

/**
 * Appointments and shifts for one doctor. When the database has none yet,
 * sample data is returned and flagged so the page can label it.
 */
export async function loadDoctorSchedule(doctor: DoctorOption): Promise<{
  appointments: Appointment[];
  shifts: ProviderShift[];
  sampleAppointments: boolean;
  sampleShifts: boolean;
}> {
  let appointments: Appointment[] = [];
  let shifts: ProviderShift[] = [];
  if (!doctor.isDemo) {
    const [appointmentResult, shiftResult] = await Promise.allSettled([
      fetchDoctorAppointments(doctor.id),
      fetchDoctorShifts(doctor.id),
    ]);
    if (appointmentResult.status === 'fulfilled') {
      appointments = appointmentResult.value;
    } else {
      console.error('Doctor appointments failed to load:', appointmentResult.reason);
    }
    if (shiftResult.status === 'fulfilled') {
      shifts = shiftResult.value;
    } else {
      console.error('Doctor shifts failed to load:', shiftResult.reason);
    }
  }
  const sampleAppointments = appointments.length === 0;
  const sampleShifts = shifts.length === 0;
  return {
    appointments: sampleAppointments ? demoAppointments(doctor) : appointments,
    shifts: sampleShifts ? demoShifts(doctor) : shifts,
    sampleAppointments,
    sampleShifts,
  };
}
