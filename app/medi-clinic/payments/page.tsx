import { recordInPersonPayment } from '../lib/actions';
import { requireClinicRole } from '../lib/access';
import { fetchPatients } from '../lib/data';

export default async function ClinicPaymentsPage() {
  const { supabase, role } = await requireClinicRole([
    'owner',
    'admin',
    'front_desk',
  ]);
  const [patients, paymentsResult] = await Promise.all([
    fetchPatients(),
    supabase
      .from('clinic_payments')
      .select('id, patient_id, amount_minor, currency, method, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (paymentsResult.error) {
    console.error('Supabase clinic payments list error:', paymentsResult.error);
    throw new Error('Unable to load clinic payment records.');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Online gateway payments are not enabled</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Payments</h1>
      </div>
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
        <h2 className="font-semibold">Record in-person payment</h2>
        <form action={recordInPersonPayment} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-[#727a90]">
            Patient
            <select className={inputClass} name="patient_id" required>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.full_name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#727a90]">
            Amount (minor units, e.g. cents)
            <input className={inputClass} min="1" name="amount_minor" required type="number" />
          </label>
          <label className="text-sm text-[#727a90]">
            ISO currency code
            <input className={inputClass} defaultValue="USD" maxLength={3} name="currency" required />
          </label>
          <div className="flex items-end">
            <button className={buttonClass}>Record payment</button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white">
        <div className="border-b border-[#eff0f4] px-5 py-4">
          <h2 className="font-semibold">Payment records</h2>
        </div>
        {(paymentsResult.data ?? []).length === 0 ? (
          <p className="p-5 text-sm text-[#727a90]">No payment records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafbfe] text-xs uppercase text-[#8b91a3]">
                <tr>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {(paymentsResult.data ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-4">
                      {patients.find((patient) => patient.id === payment.patient_id)?.full_name ?? 'Patient'}
                    </td>
                    <td className="px-5 py-4">
                      {(payment.amount_minor / 100).toFixed(2)} {payment.currency.toUpperCase()}
                    </td>
                    <td className="px-5 py-4 capitalize">{payment.method.replace('_', ' ')}</td>
                    <td className="px-5 py-4 capitalize">{payment.status.replace('_', ' ')}</td>
                    <td className="px-5 py-4">{new Date(payment.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-[#9298a8]">
        {role === 'front_desk'
          ? 'Front desk can record and view in-person payments only.'
          : 'Do not treat this register as a payment gateway settlement or accounting reconciliation.'}
      </p>
    </div>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66]';
