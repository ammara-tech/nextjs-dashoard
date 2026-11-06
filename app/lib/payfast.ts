import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * PayFast signs every notification (ITN) with an MD5 of the fields in the order
 * they were sent, URL-encoded, with the merchant passphrase added at the end.
 * We recompute it and refuse anything that does not match.
 */
function encode(value: string) {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function payfastSignature(fields: [string, string][], passphrase?: string) {
  const parts = fields
    .filter(([key, value]) => key !== 'signature' && value.trim() !== '')
    .map(([key, value]) => `${key}=${encode(value)}`);
  if (passphrase) parts.push(`passphrase=${encode(passphrase)}`);
  return createHash('md5').update(parts.join('&')).digest('hex');
}

export type ItnCheck =
  | { ok: true; paymentId: string; reference: string; status: string; amountMinor: number }
  | { ok: false; reason: string };

/** Pure check of a notification body against our merchant settings. */
export function checkItn(
  body: string,
  settings: { merchantId: string; passphrase?: string },
): ItnCheck {
  const fields = [...new URLSearchParams(body).entries()];
  const get = (key: string) => fields.find(([name]) => name === key)?.[1] ?? '';

  const given = Buffer.from(get('signature'));
  const wanted = Buffer.from(payfastSignature(fields, settings.passphrase));
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return { ok: false, reason: 'bad signature' };
  }
  if (get('merchant_id') !== settings.merchantId) {
    return { ok: false, reason: 'wrong merchant' };
  }
  const gross = Number(get('amount_gross'));
  if (!Number.isFinite(gross) || gross < 0) {
    return { ok: false, reason: 'bad amount' };
  }
  const paymentId = get('pf_payment_id');
  const reference = get('m_payment_id');
  if (!paymentId || !reference) {
    return { ok: false, reason: 'missing ids' };
  }
  return {
    ok: true,
    paymentId,
    reference,
    status: get('payment_status'),
    amountMinor: Math.round(gross * 100),
  };
}

/** Test helper: builds a correctly signed notification body. */
export function signedItn(fields: [string, string][], passphrase?: string) {
  const signature = payfastSignature(fields, passphrase);
  return new URLSearchParams([...fields, ['signature', signature]]).toString();
}
