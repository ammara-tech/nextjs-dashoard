import { NextResponse } from 'next/server';
import { createAdminClient, isAuthorisedCron } from '@/lib/supabase/admin';
import { reminderText, toE164, type DueReminder } from '@/app/lib/reminders';

export const dynamic = 'force-dynamic';

const HOUR = 60 * 60 * 1000;

async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM_EMAIL ?? 'Family Clinic <onboarding@resend.dev>',
      to,
      subject,
      text,
    }),
  });
  return response.ok;
}

async function sendSms(to: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return null;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: text }),
  });
  return response.ok;
}

/**
 * Daily job (see vercel.json). Reminds patients of appointments starting 12 to 36
 * hours from now, once per channel. Without e-mail or SMS keys it only reports who
 * would be reminded and records nothing, so it is safe to test.
 */
export async function GET(request: Request) {
  if (!isAuthorisedCron(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 503 });
  }

  const now = Date.now();
  const { data, error } = await admin.rpc('appointments_due_for_reminder', {
    p_from: new Date(now + 12 * HOUR).toISOString(),
    p_to: new Date(now + 36 * HOUR).toISOString(),
  });
  if (error) {
    console.error('Reminder lookup failed:', error);
    return NextResponse.json({ error: 'Could not look up reminders.' }, { status: 500 });
  }

  const due = (data ?? []) as DueReminder[];
  const result = { due: due.length, emailed: 0, texted: 0, failed: 0, skipped: 0 };

  for (const reminder of due) {
    const { subject, text } = reminderText(reminder);

    if (!reminder.email_done && reminder.email) {
      const ok = await sendEmail(reminder.email, subject, text);
      if (ok === null) result.skipped += 1;
      else {
        await admin.rpc('record_reminder', {
          p_appointment_id: reminder.appointment_id,
          p_channel: 'email',
          p_status: ok ? 'sent' : 'failed',
        });
        if (ok) result.emailed += 1;
        else result.failed += 1;
      }
    }

    const phone = toE164(reminder.phone);
    if (!reminder.sms_done && phone) {
      const ok = await sendSms(phone, text);
      if (ok === null) result.skipped += 1;
      else {
        await admin.rpc('record_reminder', {
          p_appointment_id: reminder.appointment_id,
          p_channel: 'sms',
          p_status: ok ? 'sent' : 'failed',
        });
        if (ok) result.texted += 1;
        else result.failed += 1;
      }
    }
  }

  return NextResponse.json({ ...result, dryRun: !process.env.RESEND_API_KEY && !process.env.TWILIO_ACCOUNT_SID });
}
