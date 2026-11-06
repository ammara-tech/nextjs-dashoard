import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkItn } from '@/app/lib/payfast';

export const dynamic = 'force-dynamic';

/**
 * PayFast (sandbox) payment notification. It only accepts a notification whose
 * signature, merchant and amount check out, and records each payment once.
 * Not yet connected to the Care Plan screens: this is the verified-webhook
 * foundation for the real gateway. Without PAYFAST_MERCHANT_ID it is switched off.
 */
export async function POST(request: Request) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  if (!merchantId) {
    return NextResponse.json({ error: 'Gateway not configured.' }, { status: 503 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 503 });
  }

  const body = await request.text();
  const result = checkItn(body, {
    merchantId,
    passphrase: process.env.PAYFAST_PASSPHRASE || undefined,
  });
  if (!result.ok) {
    console.warn('Rejected PayFast notification:', result.reason);
    return NextResponse.json({ error: 'Rejected.' }, { status: 400 });
  }

  const { data, error } = await admin.rpc('record_gateway_event', {
    p_gateway_payment_id: result.paymentId,
    p_reference: result.reference,
    p_payment_status: result.status,
    p_amount_minor: result.amountMinor,
  });
  if (error) {
    console.error('Could not record gateway event:', error);
    return NextResponse.json({ error: 'Could not record.' }, { status: 500 });
  }
  return NextResponse.json({ received: true, duplicate: data === false });
}
