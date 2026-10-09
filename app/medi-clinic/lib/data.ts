import { getClinicAccess } from './access';

export type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  email: string | null;
  patient_number: string | null;
  auth_user_id: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  patient_id: string;
  provider_id: string | null;
  appointment_type_id: string | null;
  duration_minutes: number | null;
  starts_at: string;
  status: 'booked' | 'done' | 'no_show';
  patients: { full_name: string; phone: string | null };
  clinic_providers: { display_name: string; specialty: string } | null;
  clinic_appointment_types: { name: string; category: string } | null;
};

export type ClinicProvider = {
  id: string;
  display_name: string;
  specialty: string;
  time_zone: string;
  max_daily_appointments: number;
  active: boolean;
};

export type ClinicAppointmentType = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  active: boolean;
};

export type ProviderShift = {
  id: string;
  provider_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
};

export type ProviderBlock = {
  id: string;
  provider_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
};

export type Treatment = {
  id: string;
  appointment_id: string;
  procedure: string;
  fee_cents: number;
  created_at: string;
};

export type MonthlyPatientCount = {
  label: string;
  count: number;
};

export type AppointmentStatusCount = {
  status: 'booked' | 'done' | 'no_show';
  count: number;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function fetchClinicDashboard() {
  const { supabase } = await getClinicAccess();
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [patientResult, appointmentResult] = await Promise.all([
    supabase
      .from('patients')
      .select('created_at')
      .gte('created_at', firstMonth.toISOString())
      .lt('created_at', nextMonth.toISOString()),
    supabase
      .from('appointments')
      .select('status, patients!inner(id)')
      .gte('starts_at', startOfMonth(now).toISOString())
      .lt('starts_at', nextMonth.toISOString()),
  ]);

  if (patientResult.error) {
    console.error('Supabase patient chart error:', patientResult.error);
    throw new Error(`Unable to load monthly patient counts: ${patientResult.error.message}`);
  }
  if (appointmentResult.error) {
    console.error('Supabase appointment chart error:', appointmentResult.error);
    throw new Error(`Unable to load this month’s appointment statuses: ${appointmentResult.error.message}`);
  }

  const monthlyCounts = new Map<string, number>();
  for (let offset = 0; offset < 6; offset += 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + offset, 1);
    monthlyCounts.set(
      `${month.getFullYear()}-${month.getMonth()}`,
      0,
    );
  }
  for (const patient of patientResult.data) {
    const date = new Date(patient.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthlyCounts.has(key)) {
      monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
    }
  }

  const monthlyPatients: MonthlyPatientCount[] = Array.from(
    monthlyCounts,
    ([key, count]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        label: new Date(year, month, 1).toLocaleDateString('en', {
          month: 'short',
        }),
        count,
      };
    },
  );

  const statusCounts = new Map<AppointmentStatusCount['status'], number>([
    ['booked', 0],
    ['done', 0],
    ['no_show', 0],
  ]);
  for (const appointment of appointmentResult.data) {
    const status = appointment.status as AppointmentStatusCount['status'];
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  return {
    monthlyPatients,
    appointmentStatuses: Array.from(statusCounts, ([status, count]) => ({
      status,
      count,
    })),
  };
}

export async function fetchPatients(): Promise<Patient[]> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, phone, date_of_birth, email, patient_number, auth_user_id, created_at')
    .is('archived_at', null)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Supabase patient list error:', error);
    throw new Error('Unable to load patients.');
  }
  return data;
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, patient_id, provider_id, appointment_type_id, duration_minutes, starts_at, status, patients!inner(full_name, phone), clinic_providers(display_name, specialty), clinic_appointment_types(name, category)',
    )
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Supabase appointment list error:', error);
    throw new Error('Unable to load appointments.');
  }
  return data as unknown as Appointment[];
}

export async function fetchTomorrowAppointments(): Promise<Appointment[]> {
  const { supabase } = await getClinicAccess();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate(),
  );
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, patient_id, provider_id, appointment_type_id, duration_minutes, starts_at, status, patients!inner(full_name, phone), clinic_providers(display_name, specialty), clinic_appointment_types(name, category)',
    )
    .eq('status', 'booked')
    .gte('starts_at', start.toISOString())
    .lt('starts_at', end.toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Supabase tomorrow appointment error:', error);
    throw new Error(`Unable to load tomorrow’s appointments: ${error.message}`);
  }
  return data as unknown as Appointment[];
}

export async function fetchTreatments(): Promise<Treatment[]> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('treatments')
    .select('id, appointment_id, procedure, fee_cents, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase treatment list error:', error);
    throw new Error('Unable to load treatments.');
  }
  return data;
}

export async function fetchClinicProviders(): Promise<ClinicProvider[]> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('clinic_providers')
    .select('id, display_name, specialty, time_zone, max_daily_appointments, active')
    .eq('active', true)
    .order('display_name');
  if (error) {
    console.error('Supabase clinic provider list error:', error);
    throw new Error('Unable to load clinic providers.');
  }
  return data;
}

export async function fetchClinicAppointmentTypes(): Promise<
  ClinicAppointmentType[]
> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('clinic_appointment_types')
    .select('id, name, category, duration_minutes, active')
    .eq('active', true)
    .order('category')
    .order('name');
  if (error) {
    console.error('Supabase appointment type list error:', error);
    throw new Error('Unable to load appointment types.');
  }
  return data;
}

export async function fetchProviderShifts(): Promise<ProviderShift[]> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('clinic_provider_shifts')
    .select('id, provider_id, weekday, starts_at, ends_at')
    .order('weekday')
    .order('starts_at');
  if (error) {
    console.error('Supabase provider shift list error:', error);
    throw new Error('Unable to load provider shifts.');
  }
  return data;
}

export async function fetchProviderBlocks(): Promise<ProviderBlock[]> {
  const { supabase } = await getClinicAccess();
  const { data, error } = await supabase
    .from('clinic_provider_blocks')
    .select('id, provider_id, starts_at, ends_at, reason')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at');
  if (error) {
    console.error('Supabase provider block list error:', error);
    throw new Error('Unable to load provider blocks.');
  }
  return data;
}
