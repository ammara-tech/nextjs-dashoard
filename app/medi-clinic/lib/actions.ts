'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getClinicAccess, requireClinicOwner } from './access';

const PatientSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter the patient’s full name.'),
  phone: z.string().trim().max(40).optional(),
  date_of_birth: z.string().optional(),
});

const AppointmentSchema = z.object({
  patient_id: z.string().uuid('Select a patient.'),
  starts_at: z.string().min(1, 'Choose a date and time.'),
  status: z.enum(['booked', 'done', 'no_show']),
});

const TreatmentSchema = z.object({
  appointment_id: z.string().uuid('Select an appointment.'),
  procedure: z.string().trim().min(1, 'Enter the treatment or procedure.'),
  fee_cents: z
    .string()
    .regex(/^\d+$/, 'Enter a valid fee in cents.')
    .transform(Number)
    .pipe(z.number().int().max(2_147_483_647)),
});

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function revalidateClinicPages() {
  revalidatePath('/medi-clinic');
  revalidatePath('/medi-clinic/patients');
  revalidatePath('/medi-clinic/appointments');
  revalidatePath('/medi-clinic/tomorrow');
  revalidatePath('/medi-clinic/treatments');
  revalidatePath('/dashboard/patients');
}

export async function createClinicPatient(formData: FormData) {
  const { supabase } = await getClinicAccess();
  const patient = PatientSchema.parse({
    full_name: formString(formData, 'full_name'),
    phone: formString(formData, 'phone'),
    date_of_birth: formString(formData, 'date_of_birth'),
  });
  const { error } = await supabase.from('patients').insert({
    full_name: patient.full_name,
    phone: patient.phone || null,
    date_of_birth: patient.date_of_birth || null,
  });

  if (error) {
    console.error('Supabase patient create error:', error);
    throw new Error(`Unable to create patient (${error.code}).`);
  }
  revalidateClinicPages();
}

export async function updateClinicPatient(id: string, formData: FormData) {
  const { supabase } = await getClinicAccess();
  const patient = PatientSchema.parse({
    full_name: formString(formData, 'full_name'),
    phone: formString(formData, 'phone'),
    date_of_birth: formString(formData, 'date_of_birth'),
  });
  const { data, error } = await supabase
    .from('patients')
    .update({
      full_name: patient.full_name,
      phone: patient.phone || null,
      date_of_birth: patient.date_of_birth || null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('Supabase patient update error:', error);
    throw new Error(
      error
        ? `Unable to update patient (${error.code}).`
        : 'Patient not found or you do not have permission to edit it.',
    );
  }
  revalidateClinicPages();
}

export async function deleteClinicPatient(id: string) {
  const { supabase } = await requireClinicOwner();
  const { data, error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase patient delete error:', error);
    throw new Error(
      error
        ? `Unable to delete patient (${error.code}).`
        : 'Patient not found or you do not have permission to delete it.',
    );
  }
  revalidateClinicPages();
}

export async function createClinicAppointment(formData: FormData) {
  const { supabase } = await getClinicAccess();
  const appointment = AppointmentSchema.parse({
    patient_id: formString(formData, 'patient_id'),
    starts_at: formString(formData, 'starts_at'),
    status: formString(formData, 'status') || 'booked',
  });
  const startsAt = new Date(appointment.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error('Choose a valid appointment date and time.');
  }
  const { error } = await supabase.from('appointments').insert({
    patient_id: appointment.patient_id,
    starts_at: startsAt.toISOString(),
    status: appointment.status,
  });

  if (error) {
    console.error('Supabase appointment create error:', error);
    throw new Error(`Unable to create appointment (${error.code}).`);
  }
  revalidateClinicPages();
}

export async function updateClinicAppointment(
  id: string,
  formData: FormData,
) {
  const { supabase } = await getClinicAccess();
  const appointment = AppointmentSchema.parse({
    patient_id: formString(formData, 'patient_id'),
    starts_at: formString(formData, 'starts_at'),
    status: formString(formData, 'status'),
  });
  const startsAt = new Date(appointment.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error('Choose a valid appointment date and time.');
  }
  const { data, error } = await supabase
    .from('appointments')
    .update({
      patient_id: appointment.patient_id,
      starts_at: startsAt.toISOString(),
      status: appointment.status,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('Supabase appointment update error:', error);
    throw new Error(
      error
        ? `Unable to update appointment (${error.code}).`
        : 'Appointment not found or you do not have permission to edit it.',
    );
  }
  revalidateClinicPages();
}

export async function deleteClinicAppointment(id: string) {
  const { supabase } = await requireClinicOwner();
  const { data, error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase appointment delete error:', error);
    throw new Error(
      error
        ? `Unable to delete appointment (${error.code}).`
        : 'Appointment not found or you do not have permission to delete it.',
    );
  }
  revalidateClinicPages();
}

export async function createTreatment(formData: FormData) {
  const { supabase } = await requireClinicOwner();
  const treatment = TreatmentSchema.parse({
    appointment_id: formString(formData, 'appointment_id'),
    procedure: formString(formData, 'procedure'),
    fee_cents: formString(formData, 'fee_cents'),
  });
  const { error } = await supabase.from('treatments').insert({
    appointment_id: treatment.appointment_id,
    procedure: treatment.procedure,
    fee_cents: treatment.fee_cents,
  });

  if (error) {
    console.error('Supabase treatment create error:', error);
    throw new Error(`Unable to create treatment (${error.code}).`);
  }
  revalidateClinicPages();
}

export async function updateTreatment(id: string, formData: FormData) {
  const { supabase } = await requireClinicOwner();
  const treatment = TreatmentSchema.parse({
    appointment_id: formString(formData, 'appointment_id'),
    procedure: formString(formData, 'procedure'),
    fee_cents: formString(formData, 'fee_cents'),
  });
  const { data, error } = await supabase
    .from('treatments')
    .update({
      appointment_id: treatment.appointment_id,
      procedure: treatment.procedure,
      fee_cents: treatment.fee_cents,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('Supabase treatment update error:', error);
    throw new Error(
      error
        ? `Unable to update treatment (${error.code}).`
        : 'Treatment not found or you do not have permission to edit it.',
    );
  }
  revalidateClinicPages();
}

export async function deleteTreatment(id: string) {
  const { supabase } = await requireClinicOwner();
  const { data, error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase treatment delete error:', error);
    throw new Error(
      error
        ? `Unable to delete treatment (${error.code}).`
        : 'Treatment not found or you do not have permission to delete it.',
    );
  }
  revalidateClinicPages();
}
