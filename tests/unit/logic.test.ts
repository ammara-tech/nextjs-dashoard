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
