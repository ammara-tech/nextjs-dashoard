export type DueReminder = {
  appointment_id: string;
  starts_at: string;
  patient_name: string;
  email: string | null;
  phone: string | null;
  provider_name: string | null;
  email_done: boolean;
  sms_done: boolean;
};

const TIME_ZONE = 'Africa/Johannesburg';

export function reminderText(reminder: DueReminder) {
  const when = new Date(reminder.starts_at);
  const day = when.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  });
  const time = when.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
  const first = reminder.patient_name.split(' ')[0];
  const doctor = reminder.provider_name ? ` with ${reminder.provider_name}` : '';
  return {
    subject: `Appointment reminder: ${day} at ${time}`,
    text: `Hi ${first}, this is a reminder of your Family Clinic appointment${doctor} on ${day} at ${time}. If you cannot make it, please call us so someone else can use the slot.`,
  };
}

/** South African numbers: 082 123 4567 becomes +27821234567. Anything unclear returns null. */
export function toE164(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (/^\+\d{9,15}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^27\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
