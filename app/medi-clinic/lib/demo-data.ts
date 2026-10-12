import type { Appointment, Patient, ProviderShift } from './data';

// Sample content shown when the database has no providers, appointments or
// shifts yet, so every doctor dashboard has something to display.

export type DoctorOption = {
  id: string;
  display_name: string;
  specialty: string;
  time_zone: string;
  isDemo?: boolean;
};

export const demoDoctors: DoctorOption[] = [
  {
    id: 'demo-sample-cardiologist',
    display_name: 'Dr. Sample Cardiologist',
    specialty: 'Cardiology',
    time_zone: 'Africa/Johannesburg',
    isDemo: true,
  },
  {
    id: 'demo-sample-gastroenterologist',
    display_name: 'Dr. Sample Gastroenterologist',
    specialty: 'Gastroenterology',
    time_zone: 'Africa/Johannesburg',
    isDemo: true,
  },
  {
    id: 'demo-sample-geriatrician',
    display_name: 'Dr. Sample Geriatrician',
    specialty: 'Geriatric medicine',
    time_zone: 'Africa/Johannesburg',
    isDemo: true,
  },
];

export const demoPatients: Patient[] = [
  ['Lerato Dlamini', '082 555 0101', '1988-03-14'],
  ['Pieter van der Merwe', '083 555 0102', '1975-11-02'],
  ['Naledi Khumalo', '071 555 0103', '2016-07-21'],
  ['Imran Joosub', '084 555 0104', '1992-01-30'],
  ['Thandi Mahlangu', '072 555 0105', '1964-09-09'],
  ['Zinhle Sithole', '076 555 0106', '2019-05-17'],
].map(([full_name, phone, date_of_birth], index) => ({
  id: `demo-patient-${index + 1}`,
  full_name,
  phone,
  date_of_birth,
  email: null,
  patient_number: `DEMO-${String(index + 1).padStart(4, '0')}`,
  auth_user_id: null,
  created_at: new Date().toISOString(),
}));

/** YYYY-MM-DD for a moment, as seen in the given IANA time zone. */
export function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

type SlotTemplate = {
  dayOffset: number;
  time: string;
  patient: number;
  type: string;
  minutes: number;
  status?: Appointment['status'];
};

const slotTemplates: SlotTemplate[] = [
  { dayOffset: 0, time: '08:30', patient: 0, type: 'General consultation', minutes: 30 },
  { dayOffset: 0, time: '09:15', patient: 1, type: 'Follow-up visit', minutes: 15 },
  { dayOffset: 0, time: '10:00', patient: 2, type: 'Child wellness check', minutes: 30 },
  { dayOffset: 0, time: '11:30', patient: 3, type: 'Vaccination', minutes: 15 },
  { dayOffset: 0, time: '14:00', patient: 4, type: 'General consultation', minutes: 30 },
  { dayOffset: 1, time: '09:00', patient: 5, type: 'Child wellness check', minutes: 30 },
  { dayOffset: 1, time: '10:30', patient: 0, type: 'Follow-up visit', minutes: 15 },
  { dayOffset: 2, time: '08:45', patient: 1, type: 'General consultation', minutes: 30 },
  { dayOffset: 2, time: '13:00', patient: 2, type: 'Vaccination', minutes: 15 },
  { dayOffset: 3, time: '09:30', patient: 3, type: 'General consultation', minutes: 30 },
  { dayOffset: 4, time: '11:00', patient: 4, type: 'Follow-up visit', minutes: 15 },
  { dayOffset: -1, time: '09:00', patient: 5, type: 'General consultation', minutes: 30, status: 'done' },
  { dayOffset: -1, time: '10:00', patient: 0, type: 'Vaccination', minutes: 15, status: 'done' },
  { dayOffset: -2, time: '15:00', patient: 1, type: 'Follow-up visit', minutes: 15, status: 'no_show' },
  { dayOffset: -3, time: '09:00', patient: 2, type: 'General consultation', minutes: 30, status: 'done' },
];

export function demoAppointments(doctor: DoctorOption): Appointment[] {
  const doctorIndex = Math.max(
    0,
    demoDoctors.findIndex((candidate) => candidate.id === doctor.id),
  );
  const timeZone = doctor.time_zone || 'Africa/Johannesburg';
  return slotTemplates.map((slot, index) => {
    const patient = demoPatients[(slot.patient + doctorIndex) % demoPatients.length];
    const day = new Date();
    day.setDate(day.getDate() + slot.dayOffset);
    // Demo doctors all use Africa/Johannesburg (UTC+02:00, no daylight saving).
    const startsAt = new Date(`${dayKey(day, timeZone)}T${slot.time}:00+02:00`);
    return {
      id: `demo-appointment-${doctor.id}-${index}`,
      patient_id: patient.id,
      provider_id: doctor.id,
      appointment_type_id: null,
      duration_minutes: slot.minutes,
      starts_at: startsAt.toISOString(),
      status: slot.status ?? 'booked',
      patients: { full_name: patient.full_name, phone: patient.phone },
      clinic_providers: {
        display_name: doctor.display_name,
        specialty: doctor.specialty,
      },
      clinic_appointment_types: { name: slot.type, category: 'Consultation' },
    };
  });
}

export function demoShifts(doctor: DoctorOption): ProviderShift[] {
  const doctorIndex = Math.max(
    0,
    demoDoctors.findIndex((candidate) => candidate.id === doctor.id),
  );
  const make = (weekday: number, starts: string, ends: string): ProviderShift => ({
    id: `demo-shift-${doctor.id}-${weekday}-${starts}`,
    provider_id: doctor.id,
    weekday,
    starts_at: `${starts}:00`,
    ends_at: `${ends}:00`,
  });
  if (doctorIndex === 1) {
    return [1, 2, 3, 4, 5].map((day) => make(day, '09:00', '16:00'));
  }
  if (doctorIndex === 2) {
    return [
      make(1, '08:00', '14:00'),
      make(2, '12:00', '18:00'),
      make(3, '08:00', '14:00'),
      make(4, '12:00', '18:00'),
      make(5, '08:00', '14:00'),
    ];
  }
  return [1, 2, 3, 4, 5].map((day) => make(day, '08:00', '17:00'));
}
