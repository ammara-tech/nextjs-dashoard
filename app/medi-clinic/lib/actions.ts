'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  requireClinicOwner,
  requireClinicRole,
  requireClinicStaff,
} from './access';

const PatientSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter the patient’s full name.'),
  phone: z.string().trim().max(40).optional(),
  date_of_birth: z.string().optional(),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]).optional(),
});

const AppointmentSchema = z.object({
  patient_id: z.string().uuid('Select a patient.'),
  provider_id: z.string().uuid('Select a provider.'),
  appointment_type_id: z.string().uuid('Select an appointment type.'),
  starts_at: z.string().min(1, 'Choose a date and time.'),
  status: z.enum(['booked', 'done', 'no_show']),
});

const ProviderSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  specialty: z.string().trim().min(1).max(120),
  auth_user_id: z.union([z.literal(''), z.string().uuid()]).optional(),
  time_zone: z.string().trim().min(1).max(100).refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Enter a valid IANA time zone.'),
  max_daily_appointments: z
    .string()
    .regex(/^\d+$/, 'Enter a valid daily limit.')
    .transform(Number)
    .pipe(z.number().int().min(1).max(500)),
});

const AppointmentTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  duration_minutes: z
    .string()
    .regex(/^\d+$/, 'Enter a duration in minutes.')
    .transform(Number)
    .pipe(z.number().int().min(5).max(480)),
});

const ProviderShiftSchema = z.object({
  provider_id: z.string().uuid('Select a provider.'),
  weekday: z
    .string()
    .regex(/^[0-6]$/, 'Select a weekday.')
    .transform(Number),
  starts_at: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a start time.'),
  ends_at: z.string().regex(/^\d{2}:\d{2}$/, 'Choose an end time.'),
});

const ProviderBlockSchema = z.object({
  provider_id: z.string().uuid('Select a provider.'),
  starts_at: z.string().min(1, 'Choose a start time.'),
  ends_at: z.string().min(1, 'Choose an end time.'),
  reason: z.string().trim().min(1).max(240),
});

export type AppointmentActionState = {
  message?: string;
  success?: boolean;
};

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

function localDateTimeInZoneToUtc(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const target = Date.UTC(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    Number(hourText),
    Number(minuteText),
  );
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const values = new Map(
      formatter
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value]),
    );
    const localAsUtc = Date.UTC(
      Number(values.get('year')),
      Number(values.get('month')) - 1,
      Number(values.get('day')),
      Number(values.get('hour')),
      Number(values.get('minute')),
    );
    instant += target - localAsUtc;
  }

  const resolved = new Map(
    formatter
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  const isExact =
    resolved.get('year') === yearText &&
    resolved.get('month') === monthText &&
    resolved.get('day') === dayText &&
    resolved.get('hour') === hourText &&
    resolved.get('minute') === minuteText;
  return isExact ? new Date(instant).toISOString() : null;
}

function revalidateClinicPages() {
  revalidatePath('/medi-clinic');
  revalidatePath('/medi-clinic/patients');
  revalidatePath('/medi-clinic/appointments');
  revalidatePath('/medi-clinic/tomorrow');
  revalidatePath('/medi-clinic/treatments');
  revalidatePath('/dashboard/patients');
}

export async function updateClinicPatient(id: string, formData: FormData) {
  const { supabase } = await requireClinicStaff();
  const patient = PatientSchema.parse({
    full_name: formString(formData, 'full_name'),
    phone: formString(formData, 'phone'),
    date_of_birth: formString(formData, 'date_of_birth'),
    email: formString(formData, 'email'),
  });
  const { data, error } = await supabase
    .from('patients')
    .update({
      full_name: patient.full_name,
      phone: patient.phone || null,
      date_of_birth: patient.date_of_birth || null,
      email: patient.email || null,
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

export async function archiveClinicPatient(id: string) {
  const { supabase } = await requireClinicRole(['owner', 'admin']);
  const { data, error } = await supabase
    .from('patients')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .is('archived_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase patient archive error:', error);
    throw new Error(
      error
        ? `Unable to archive patient (${error.code}).`
        : 'Patient not found or already archived.',
    );
  }
  revalidateClinicPages();
}

export async function linkClinicPatientAccount(
  patientId: string,
  formData: FormData,
) {
  const { supabase } = await requireClinicOwner();
  const authUserId = formString(formData, 'auth_user_id');
  if (!z.string().uuid().safeParse(authUserId).success) {
    throw new Error('Enter a valid Supabase Auth user UUID.');
  }
  const { data, error } = await supabase
    .from('patients')
    .update({ auth_user_id: authUserId })
    .eq('id', patientId)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase patient account link error:', error);
    throw new Error(
      error
        ? `Unable to link patient account (${error.code}).`
        : 'Patient not found or access denied.',
    );
  }
  revalidateClinicPages();
}

export async function approvePatientAccessRequest(formData: FormData) {
  const { supabase } = await requireClinicRole(['owner', 'admin']);
  const requestId = formString(formData, 'request_id');
  if (!z.string().uuid().safeParse(requestId).success) {
    throw new Error('Invalid patient access request.');
  }

  const { error } = await supabase.rpc('approve_clinic_patient_access', {
    p_request_id: requestId,
  });
  if (error) {
    console.error('Supabase patient access approval error:', error);
    throw new Error(`Unable to approve patient access (${error.code}).`);
  }

  revalidatePath('/medi-clinic');
  revalidatePath('/medi-clinic/patient-access');
  revalidatePath('/medi-clinic/patients');
}

export async function denyPatientAccessRequest(formData: FormData) {
  const { supabase } = await requireClinicRole(['owner', 'admin']);
  const requestId = formString(formData, 'request_id');
  if (!z.string().uuid().safeParse(requestId).success) {
    throw new Error('Invalid patient access request.');
  }

  const { error } = await supabase.rpc('deny_clinic_patient_access', {
    p_request_id: requestId,
  });
  if (error) {
    console.error('Supabase patient access denial error:', error);
    throw new Error(`Unable to deny patient access (${error.code}).`);
  }

  revalidatePath('/medi-clinic');
  revalidatePath('/medi-clinic/patient-access');
}

export async function createClinicAppointment(
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const access = await requireClinicRole([
    'owner',
    'front_desk',
    'admin',
    'patient',
  ]);
  let patientId = formString(formData, 'patient_id');
  if (access.role === 'patient') {
    const { data: patient, error } = await access.supabase
      .from('patients')
      .select('id')
      .eq('auth_user_id', access.user.id)
      .maybeSingle();
    if (error || !patient) {
      console.error('Supabase patient booking link lookup error:', error);
      return { message: 'Your account is not linked to a patient record.' };
    }
    patientId = patient.id;
  }
  const validated = AppointmentSchema.safeParse({
    patient_id: patientId,
    provider_id: formString(formData, 'provider_id'),
    appointment_type_id: formString(formData, 'appointment_type_id'),
    starts_at: formString(formData, 'starts_at'),
    status: 'booked',
  });
  if (!validated.success) {
    return {
      message:
        validated.error.issues[0]?.message ??
        'Check the appointment details and try again.',
    };
  }

  const { supabase } = access;
  const { data: provider, error: providerError } = await supabase
    .from('clinic_providers')
    .select('time_zone')
    .eq('id', validated.data.provider_id)
    .maybeSingle();
  if (providerError || !provider) {
    console.error('Supabase appointment provider lookup error:', providerError);
    return { message: 'The selected provider is unavailable.' };
  }
  const startsAt = localDateTimeInZoneToUtc(
    validated.data.starts_at,
    provider.time_zone,
  );
  if (!startsAt) {
    return {
      message:
        'Choose a valid local appointment time; times skipped by daylight-saving changes cannot be booked.',
    };
  }
  const { error } = await supabase.rpc('book_clinic_appointment', {
    p_patient_id: validated.data.patient_id,
    p_provider_id: validated.data.provider_id,
    p_appointment_type_id: validated.data.appointment_type_id,
    p_starts_at: startsAt,
  });

  if (error) {
    console.error('Supabase appointment create error:', error);
    return {
      message: `Unable to book appointment: ${error.message} (${error.code}). Check that the clinic scheduling migration is applied, the selected patient belongs to this clinic, and the time is within the provider's shift.`,
    };
  }
  revalidateClinicPages();
  revalidatePath('/medi-clinic/portal');
  return { message: 'Appointment booked.', success: true };
}

export async function updateClinicAppointment(
  id: string,
  formData: FormData,
) {
  const { supabase } = await requireClinicStaff();
  const appointment = AppointmentSchema.parse({
    patient_id: formString(formData, 'patient_id'),
    provider_id: formString(formData, 'provider_id'),
    appointment_type_id: formString(formData, 'appointment_type_id'),
    starts_at: formString(formData, 'starts_at'),
    status: formString(formData, 'status'),
  });
  const { data: provider, error: providerError } = await supabase
    .from('clinic_providers')
    .select('time_zone')
    .eq('id', appointment.provider_id)
    .maybeSingle();
  if (providerError || !provider) {
    console.error('Supabase appointment provider lookup error:', providerError);
    throw new Error('The selected provider is unavailable.');
  }
  const startsAt = localDateTimeInZoneToUtc(
    appointment.starts_at,
    provider.time_zone,
  );
  if (!startsAt) {
    throw new Error(
      'Choose a valid local appointment time; times skipped by daylight-saving changes cannot be booked.',
    );
  }
  const { error } = await supabase.rpc('update_clinic_appointment', {
    p_appointment_id: id,
    p_patient_id: appointment.patient_id,
    p_provider_id: appointment.provider_id,
    p_appointment_type_id: appointment.appointment_type_id,
    p_starts_at: startsAt,
    p_status: appointment.status,
  });

  if (error) {
    console.error('Supabase appointment update error:', error);
    throw new Error(`Unable to update appointment (${error.code}): ${error.message}`);
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

export async function createClinicProvider(formData: FormData) {
  const { supabase } = await requireClinicOwner();
  const provider = ProviderSchema.parse({
    display_name: formString(formData, 'display_name'),
    specialty: formString(formData, 'specialty'),
    auth_user_id: formString(formData, 'auth_user_id'),
    time_zone: formString(formData, 'time_zone') || 'UTC',
    max_daily_appointments: formString(formData, 'max_daily_appointments') || '20',
  });
  const { error } = await supabase.from('clinic_providers').insert({
    display_name: provider.display_name,
    specialty: provider.specialty,
    auth_user_id: provider.auth_user_id || null,
    time_zone: provider.time_zone,
    max_daily_appointments: provider.max_daily_appointments,
  });
  if (error) {
    console.error('Supabase clinic provider create error:', error);
    throw new Error(`Unable to create provider (${error.code}).`);
  }
  revalidatePath('/medi-clinic/providers');
  revalidatePath('/medi-clinic/appointments');
}

export async function createClinicAppointmentType(formData: FormData) {
  const { supabase } = await requireClinicOwner();
  const appointmentType = AppointmentTypeSchema.parse({
    name: formString(formData, 'name'),
    category: formString(formData, 'category'),
    duration_minutes: formString(formData, 'duration_minutes'),
  });
  const { error } = await supabase.from('clinic_appointment_types').insert({
    name: appointmentType.name,
    category: appointmentType.category,
    duration_minutes: appointmentType.duration_minutes,
  });
  if (error) {
    console.error('Supabase appointment type create error:', error);
    throw new Error(`Unable to create appointment type (${error.code}).`);
  }
  revalidatePath('/medi-clinic/providers');
  revalidatePath('/medi-clinic/appointments');
}

export async function createClinicProviderShift(formData: FormData) {
  const { supabase } = await requireClinicOwner();
  const shift = ProviderShiftSchema.parse({
    provider_id: formString(formData, 'provider_id'),
    weekday: formString(formData, 'weekday'),
    starts_at: formString(formData, 'starts_at'),
    ends_at: formString(formData, 'ends_at'),
  });
  if (shift.starts_at >= shift.ends_at) {
    throw new Error('Shift end time must be later than its start time.');
  }
  const { error } = await supabase.from('clinic_provider_shifts').insert(shift);
  if (error) {
    console.error('Supabase provider shift create error:', error);
    throw new Error(`Unable to create provider shift (${error.code}).`);
  }
  revalidatePath('/medi-clinic/providers');
  revalidatePath('/medi-clinic/appointments');
}

export async function createClinicProviderBlock(formData: FormData) {
  const { supabase } = await requireClinicOwner();
  const block = ProviderBlockSchema.parse({
    provider_id: formString(formData, 'provider_id'),
    starts_at: formString(formData, 'starts_at'),
    ends_at: formString(formData, 'ends_at'),
    reason: formString(formData, 'reason'),
  });
  const { data: provider, error: providerError } = await supabase
    .from('clinic_providers')
    .select('time_zone')
    .eq('id', block.provider_id)
    .maybeSingle();
  if (providerError || !provider) {
    console.error('Supabase provider block lookup error:', providerError);
    throw new Error('The selected provider is unavailable.');
  }
  const startsAt = localDateTimeInZoneToUtc(
    block.starts_at,
    provider.time_zone,
  );
  const endsAt = localDateTimeInZoneToUtc(block.ends_at, provider.time_zone);
  if (!startsAt || !endsAt || startsAt >= endsAt) {
    throw new Error('Choose a valid block with an end after its start.');
  }
  const { error } = await supabase.from('clinic_provider_blocks').insert({
    provider_id: block.provider_id,
    starts_at: startsAt,
    ends_at: endsAt,
    reason: block.reason,
  });
  if (error) {
    console.error('Supabase provider block create error:', error);
    throw new Error(`Unable to create provider block (${error.code}).`);
  }
  revalidatePath('/medi-clinic/providers');
  revalidatePath('/medi-clinic/appointments');
}

export async function uploadPatientDocument(formData: FormData) {
  const { supabase, role } = await requireClinicRole([
    'owner',
    'front_desk',
    'doctor',
  ]);
  const patientId = formString(formData, 'patient_id');
  const category = formString(formData, 'category');
  const file = formData.get('file');
  if (!z.string().uuid().safeParse(patientId).success) {
    throw new Error('Select a valid patient.');
  }
  if (!['identity', 'clinical_history', 'invoices'].includes(category)) {
    throw new Error('Select a valid document category.');
  }
  if (role === 'front_desk' && category === 'clinical_history') {
    throw new Error('Front-desk staff cannot upload clinical-history documents.');
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a document to upload.');
  }
  const allowedTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
  ]);
  if (!allowedTypes.has(file.type) || file.size > 20 * 1024 * 1024) {
    throw new Error('Upload a PDF, JPEG, or PNG file up to 20 MB.');
  }
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();
  if (patientError || !patient) {
    console.error('Supabase document patient lookup error:', patientError);
    throw new Error('Patient not found or access denied.');
  }
  if (role === 'doctor') {
    const { data: assignedPatient, error: assignmentError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .limit(1)
      .maybeSingle();
    if (assignmentError || !assignedPatient) {
      console.error('Supabase doctor document assignment check error:', assignmentError);
      throw new Error('This patient is not assigned to your care.');
    }
  }
  const objectPath = `pt_${patientId}/${category}/${crypto.randomUUID()}`;
  const { error: uploadError } = await supabase.storage
    .from('patients-medical-records')
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    console.error('Supabase patient document upload error:', uploadError);
    throw new Error(`Unable to upload document (${uploadError.message}).`);
  }

  const { error: metadataError } = await supabase
    .from('clinic_patient_documents')
    .insert({
      patient_id: patientId,
      object_path: objectPath,
      category,
      original_name: file.name.slice(0, 255),
      content_type: file.type,
      byte_size: file.size,
    });
  if (metadataError) {
    console.error('Supabase patient document metadata error:', metadataError);
    const { error: cleanupError } = await supabase.storage
      .from('patients-medical-records')
      .remove([objectPath]);
    if (cleanupError) {
      console.error('Supabase orphan document cleanup error:', cleanupError);
    }
    throw new Error(
      `Document uploaded but could not be registered (${metadataError.code}).`,
    );
  }
  revalidatePath('/medi-clinic/portal');
  revalidatePath('/medi-clinic/patients');
  if (role === 'owner') revalidatePath('/medi-clinic');
}

const InPersonPaymentSchema = z.object({
  patient_id: z.string().uuid(),
  amount_minor: z
    .string()
    .regex(/^\d+$/, 'Enter an amount in minor currency units.')
    .transform(Number)
    .pipe(z.number().int().min(1).max(2_147_483_647)),
  currency: z.string().regex(/^[A-Za-z]{3}$/, 'Enter a three-letter currency code.'),
});

export async function recordInPersonPayment(formData: FormData) {
  const { supabase, role, user } = await requireClinicRole([
    'owner',
    'admin',
    'front_desk',
  ]);
  const parsed = InPersonPaymentSchema.safeParse({
    patient_id: formString(formData, 'patient_id'),
    amount_minor: formString(formData, 'amount_minor'),
    currency: formString(formData, 'currency'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Check payment details.');
  }
  const { error } = await supabase.from('clinic_payments').insert({
    patient_id: parsed.data.patient_id,
    amount_minor: parsed.data.amount_minor,
    currency: parsed.data.currency.toUpperCase(),
    method: 'in_person',
    status: 'paid',
    recorded_by: user.id,
  });
  if (error) {
    console.error('Supabase in-person payment error:', error);
    throw new Error(`Unable to record in-person payment (${error.code}).`);
  }
  revalidatePath('/medi-clinic/payments');
  revalidatePath('/medi-clinic/portal');
}

export async function createInventoryItem(formData: FormData) {
  const { supabase } = await requireClinicRole(['owner', 'admin', 'stock_manager']);
  const name = formString(formData, 'name');
  const sku = formString(formData, 'sku');
  if (!name || name.length > 160 || sku.length > 80) {
    throw new Error('Enter a valid item name and optional SKU.');
  }
  const { error } = await supabase.from('clinic_inventory_items').insert({
    name,
    sku: sku || null,
  });
  if (error) {
    console.error('Supabase inventory item create error:', error);
    throw new Error(`Unable to add inventory item (${error.code}).`);
  }
  revalidatePath('/medi-clinic/pharmacy');
}

export async function receiveInventoryBatch(formData: FormData) {
  const { supabase } = await requireClinicRole(['owner', 'admin', 'stock_manager']);
  const itemId = formString(formData, 'item_id');
  const batchNumber = formString(formData, 'batch_number');
  const quantity = z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(2_147_483_647))
    .safeParse(formString(formData, 'quantity'));
  const expiresOn = formString(formData, 'expires_on');
  if (
    !z.string().uuid().safeParse(itemId).success ||
    !batchNumber ||
    batchNumber.length > 120 ||
    !quantity.success
  ) {
    throw new Error('Check the inventory batch details.');
  }
  const { error } = await supabase.from('clinic_inventory_batches').insert({
    item_id: itemId,
    batch_number: batchNumber,
    quantity: quantity.data,
    expires_on: expiresOn || null,
  });
  if (error) {
    console.error('Supabase inventory batch create error:', error);
    throw new Error(`Unable to receive inventory batch (${error.code}).`);
  }
  revalidatePath('/medi-clinic/pharmacy');
}

export async function dispenseClinicPrescription(formData: FormData) {
  const { supabase } = await requireClinicRole(['owner', 'admin', 'pharmacist']);
  const prescriptionId = formString(formData, 'prescription_id');
  if (!z.string().uuid().safeParse(prescriptionId).success) {
    throw new Error('Select a valid prescription.');
  }
  const { data, error } = await supabase
    .from('clinic_prescriptions')
    .update({ status: 'dispensed' })
    .eq('id', prescriptionId)
    .eq('status', 'issued')
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase prescription dispense error:', error);
    throw new Error(
      error
        ? `Unable to dispense prescription (${error.code}).`
        : 'Prescription is no longer available to dispense.',
    );
  }
  revalidatePath('/medi-clinic/pharmacy');
  revalidatePath('/medi-clinic/clinical');
}

export async function createClinicEncounter(formData: FormData) {
  const { supabase } = await requireClinicRole(['doctor']);
  const appointmentId = formString(formData, 'appointment_id');
  const note = formString(formData, 'note');
  if (!z.string().uuid().safeParse(appointmentId).success || !note || note.length > 20000) {
    throw new Error('Choose an appointment and enter a clinical note.');
  }
  const { error } = await supabase.rpc('create_clinic_encounter', {
    p_appointment_id: appointmentId,
    p_note: note,
  });
  if (error) {
    console.error('Supabase clinical encounter create error:', error);
    throw new Error(`Unable to create encounter (${error.code}): ${error.message}`);
  }
  revalidatePath('/medi-clinic/clinical');
}

export async function signClinicEncounter(formData: FormData) {
  const { supabase } = await requireClinicRole(['doctor']);
  const encounterId = formString(formData, 'encounter_id');
  const note = formString(formData, 'note');
  if (!z.string().uuid().safeParse(encounterId).success || note.length > 20000) {
    throw new Error('Choose a valid encounter and note.');
  }
  const { error } = await supabase.rpc('sign_clinic_encounter', {
    p_encounter_id: encounterId,
    p_additional_note: note || null,
  });
  if (error) {
    console.error('Supabase clinical encounter sign error:', error);
    throw new Error(`Unable to sign encounter (${error.code}): ${error.message}`);
  }
  revalidatePath('/medi-clinic/clinical');
  revalidatePath('/medi-clinic/portal');
}

export async function addClinicalAddendum(formData: FormData) {
  const { supabase } = await requireClinicRole(['doctor']);
  const encounterId = formString(formData, 'encounter_id');
  const body = formString(formData, 'body');
  if (
    !z.string().uuid().safeParse(encounterId).success ||
    !body ||
    body.length > 20000
  ) {
    throw new Error('Choose a signed encounter and enter an addendum.');
  }
  const { error } = await supabase.rpc('add_clinical_addendum', {
    p_encounter_id: encounterId,
    p_body: body,
  });
  if (error) {
    console.error('Supabase clinical addendum error:', error);
    throw new Error(`Unable to add clinical addendum (${error.code}).`);
  }
  revalidatePath('/medi-clinic/clinical');
}

export async function issueClinicPrescription(formData: FormData) {
  const { supabase, user } = await requireClinicRole(['doctor']);
  const encounterId = formString(formData, 'encounter_id');
  const medication = formString(formData, 'medication');
  const instructions = formString(formData, 'instructions');
  if (
    !z.string().uuid().safeParse(encounterId).success ||
    !medication ||
    medication.length > 200 ||
    !instructions ||
    instructions.length > 2000
  ) {
    throw new Error('Check the prescription details.');
  }
  const { data: encounter, error: encounterError } = await supabase
    .from('clinic_encounters')
    .select('patient_id')
    .eq('id', encounterId)
    .eq('status', 'signed')
    .maybeSingle();
  if (encounterError || !encounter) {
    console.error('Supabase prescription encounter lookup error:', encounterError);
    throw new Error('A signed encounter is required to issue a prescription.');
  }
  const { error } = await supabase.from('clinic_prescriptions').insert({
    encounter_id: encounterId,
    patient_id: encounter.patient_id,
    prescribed_by: user.id,
    medication,
    instructions,
  });
  if (error) {
    console.error('Supabase prescription issue error:', error);
    throw new Error(`Unable to issue prescription (${error.code}).`);
  }
  revalidatePath('/medi-clinic/clinical');
  revalidatePath('/medi-clinic/pharmacy');
  revalidatePath('/medi-clinic/portal');
}

export async function createClinicSupportRequest(formData: FormData) {
  const { supabase, user } = await requireClinicRole(['patient']);
  const subject = formString(formData, 'subject');
  const message = formString(formData, 'message');
  if (!subject || subject.length > 160 || !message || message.length > 4000) {
    throw new Error('Enter a subject and a message of up to 4,000 characters.');
  }
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (patientError || !patient) {
    console.error('Supabase support patient lookup error:', patientError);
    throw new Error('Your account is not linked to a patient record.');
  }
  const { error } = await supabase.from('clinic_support_requests').insert({
    patient_id: patient.id,
    subject,
    message,
  });
  if (error) {
    console.error('Supabase support request create error:', error);
    throw new Error(`Unable to send support request (${error.code}).`);
  }
  revalidatePath('/medi-clinic/support');
  revalidatePath('/medi-clinic/enquiries');
}

export async function updateSupportRequestStatus(formData: FormData) {
  const { supabase } = await requireClinicRole(['owner', 'admin', 'front_desk']);
  const requestId = formString(formData, 'request_id');
  const status = formString(formData, 'status');
  if (
    !z.string().uuid().safeParse(requestId).success ||
    !['open', 'in_progress', 'resolved'].includes(status)
  ) {
    throw new Error('Choose a valid support request status.');
  }
  const { data, error } = await supabase
    .from('clinic_support_requests')
    .update({ status })
    .eq('id', requestId)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    console.error('Supabase support request update error:', error);
    throw new Error(
      error ? `Unable to update request (${error.code}).` : 'Request not found.',
    );
  }
  revalidatePath('/medi-clinic/enquiries');
}
