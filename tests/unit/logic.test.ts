import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeStockAlerts } from '../../app/medi-clinic/lib/stock.ts';
import { reminderText, toE164 } from '../../app/lib/reminders.ts';

const today = new Date(2026, 10, 6); // 6 Nov 2026

test('stock: low, expiring and expired batches are flagged', () => {
  const items = [
    { id: 'a', name: 'Paracetamol' },
    { id: 'b', name: 'Amoxicillin' },
    { id: 'c', name: 'Gauze' },
  ];
  const batches = [
    { item_id: 'a', quantity: 50, expires_on: '2027-06-01', available: true },
    { item_id: 'b', quantity: 40, expires_on: '2026-11-20', available: true },
    { item_id: 'b', quantity: 5, expires_on: '2026-10-01', available: true },
    { item_id: 'c', quantity: 3, expires_on: null, available: true },
  ];
  const alerts = computeStockAlerts(items, batches, today);
  assert.deepEqual(
    alerts.map((alert) => [alert.kind, alert.itemName]),
    [
      ['expired', 'Amoxicillin'],
      ['expiring', 'Amoxicillin'],
      ['low', 'Gauze'],
    ],
  );
});

test('stock: unavailable batches do not count towards stock', () => {
  const alerts = computeStockAlerts(
    [{ id: 'a', name: 'Insulin' }],
    [{ item_id: 'a', quantity: 100, expires_on: null, available: false }],
    today,
  );
  assert.equal(alerts[0].kind, 'low');
  assert.equal(alerts[0].detail, 'None left');
});

test('stock: healthy stock raises nothing', () => {
  const alerts = computeStockAlerts(
    [{ id: 'a', name: 'Plasters' }],
    [{ item_id: 'a', quantity: 200, expires_on: '2028-01-01', available: true }],
    today,
  );
  assert.equal(alerts.length, 0);
});

test('phone numbers are normalised for SMS', () => {
  assert.equal(toE164('082 123 4567'), '+27821234567');
  assert.equal(toE164('+27 82 123 4567'), '+27821234567');
  assert.equal(toE164('27821234567'), '+27821234567');
  assert.equal(toE164('call me'), null);
  assert.equal(toE164(null), null);
});

test('reminder text names the patient, the doctor and the time', () => {
  const { subject, text } = reminderText({
    appointment_id: 'x',
    starts_at: '2026-11-09T07:30:00Z',
    patient_name: 'Alice Test',
    email: null,
    phone: null,
    provider_name: 'Dr. Sample',
    email_done: false,
    sms_done: false,
  });
  assert.match(subject, /09:30/);
  assert.match(text, /Hi Alice/);
  assert.match(text, /Dr\. Sample/);
});

import { checkItn, payfastSignature, signedItn } from '../../app/lib/payfast.ts';

const itn: [string, string][] = [
  ['m_payment_id', 'PLAN-123'],
  ['pf_payment_id', '1089250'],
  ['payment_status', 'COMPLETE'],
  ['amount_gross', '199.00'],
  ['merchant_id', '10000100'],
  ['item_name', 'Essential plan'],
];

test('gateway: a correctly signed notification is accepted', () => {
  const body = signedItn(itn, 'secret phrase');
  const result = checkItn(body, { merchantId: '10000100', passphrase: 'secret phrase' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.amountMinor, 19900);
    assert.equal(result.reference, 'PLAN-123');
    assert.equal(result.status, 'COMPLETE');
  }
});

test('gateway: tampering, the wrong passphrase or the wrong merchant are refused', () => {
  const body = signedItn(itn, 'secret phrase');
  assert.deepEqual(checkItn(body.replace('199.00', '1.00'), { merchantId: '10000100', passphrase: 'secret phrase' }), {
    ok: false,
    reason: 'bad signature',
  });
  assert.equal(checkItn(body, { merchantId: '10000100', passphrase: 'other' }).ok, false);
  assert.deepEqual(checkItn(body, { merchantId: '999', passphrase: 'secret phrase' }), {
    ok: false,
    reason: 'wrong merchant',
  });
  assert.equal(checkItn('m_payment_id=x', { merchantId: '1' }).ok, false);
});

test('gateway: signature depends on field order and ignores empty fields', () => {
  const a = payfastSignature([['a', '1'], ['b', '2']]);
  const b = payfastSignature([['b', '2'], ['a', '1']]);
  assert.notEqual(a, b);
  assert.equal(payfastSignature([['a', '1'], ['empty', ''], ['b', '2']]), a);
});
