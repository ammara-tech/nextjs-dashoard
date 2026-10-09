import { redirect } from 'next/navigation';
import {
  createInventoryItem,
  dispenseClinicPrescription,
  receiveInventoryBatch,
} from '../lib/actions';
import { getClinicAccess, redirectToClinicSignIn } from '../lib/access';

export default async function PharmacyPage() {
  const { supabase, role } = await getClinicAccess();
  if (role === 'front_desk') {
    redirect('/medi-clinic/payments');
  }
  if (!['owner', 'admin', 'stock_manager', 'pharmacist'].includes(role)) {
    redirectToClinicSignIn('/medi-clinic/pharmacy');
  }
  const canStock =
    role === 'owner' || role === 'admin' || role === 'stock_manager';
  const [itemsResult, batchesResult, prescriptionsResult] = await Promise.all([
    supabase
      .from('clinic_inventory_items')
      .select('id, name, sku')
      .eq('active', true)
      .order('name'),
    supabase
      .from('clinic_inventory_batches')
      .select('id, item_id, batch_number, expires_on, quantity')
      .order('expires_on'),
    supabase
      .from('clinic_prescriptions')
      .select('id, patient_id, medication, instructions, status, created_at')
      .in('status', ['issued', 'dispensed'])
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  for (const [label, error] of [
    ['inventory items', itemsResult.error],
    ['inventory batches', batchesResult.error],
    ['prescriptions', prescriptionsResult.error],
  ] as const) {
    if (error) {
      console.error(`Supabase pharmacy ${label} error:`, error);
      return <PharmacyDataError code={error.code} label={label} />;
    }
  }
  const patientsResult = await supabase
    .from('patients')
    .select('id, full_name');
  if (patientsResult.error) {
    console.error('Supabase pharmacy patient lookup error:', patientsResult.error);
    return (
      <PharmacyDataError
        code={patientsResult.error.code}
        label="prescription patient names"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Role-scoped prescription and stock workflow</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Pharmacy</h1>
      </div>

      {canStock && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
            <h2 className="font-semibold">Add inventory item</h2>
            <form action={createInventoryItem} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[#727a90]">
                Item name
                <input className={inputClass} maxLength={160} name="name" required />
              </label>
              <label className="text-sm text-[#727a90]">
                SKU (optional)
                <input className={inputClass} maxLength={80} name="sku" />
              </label>
              <button className={buttonClass}>Add item</button>
            </form>
          </div>
          <div className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
            <h2 className="font-semibold">Receive batch</h2>
            {itemsResult.data?.length ? (
              <form action={receiveInventoryBatch} className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-[#727a90]">
                  Item
                  <select className={inputClass} name="item_id" required>
                    <option value="">Select item</option>
                    {itemsResult.data.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-[#727a90]">
                  Batch number
                  <input className={inputClass} maxLength={120} name="batch_number" required />
                </label>
                <label className="text-sm text-[#727a90]">
                  Quantity
                  <input className={inputClass} min="1" name="quantity" required type="number" />
                </label>
                <label className="text-sm text-[#727a90]">
                  Expiry date
                  <input className={inputClass} name="expires_on" type="date" />
                </label>
                <button className={buttonClass}>Receive stock</button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-[#727a90]">Add an inventory item first.</p>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
        <h2 className="font-semibold">Inventory batches</h2>
        {(batchesResult.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">No batches received yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-[#8b91a3]">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {(batchesResult.data ?? []).map((batch) => {
                  const expired =
                    batch.expires_on !== null &&
                    new Date(`${batch.expires_on}T00:00:00`) < new Date();
                  return (
                    <tr key={batch.id}>
                      <td className="px-3 py-3">
                        {itemsResult.data?.find((item) => item.id === batch.item_id)?.name ?? 'Item'}
                      </td>
                      <td className="px-3 py-3">{batch.batch_number}</td>
                      <td className="px-3 py-3">{batch.quantity}</td>
                      <td className="px-3 py-3">{batch.expires_on ?? '—'}</td>
                      <td className={`px-3 py-3 ${expired ? 'font-semibold text-red-600' : 'text-[#727a90]'}`}>
                        {expired ? 'Expired — review' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {role !== 'stock_manager' && (
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
          <h2 className="font-semibold">Prescription queue</h2>
          {(prescriptionsResult.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-[#727a90]">No prescriptions are available.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#eff0f4]">
              {(prescriptionsResult.data ?? []).map((prescription) => (
                <li className="flex flex-wrap items-start justify-between gap-4 py-4" key={prescription.id}>
                  <div>
                    <p className="font-medium">
                      {patientsResult.data?.find((patient) => patient.id === prescription.patient_id)?.full_name ?? 'Patient'}
                      {' — '}{prescription.medication}
                    </p>
                    <p className="mt-1 text-sm text-[#727a90]">{prescription.instructions}</p>
                    <p className="mt-1 text-xs capitalize text-[#9298a8]">
                      {prescription.status} · {new Date(prescription.created_at).toLocaleString()}
                    </p>
                  </div>
                  {prescription.status === 'issued' && (
                    <form action={dispenseClinicPrescription}>
                      <input name="prescription_id" type="hidden" value={prescription.id} />
                      <button className={buttonClass}>Mark dispensed</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="text-xs text-[#9298a8]">
        Inventory receipt and prescription status are recorded here; this page
        does not yet deduct stock or perform drug-interaction checks.
      </p>
    </div>
  );
}

function PharmacyDataError({ code, label }: { code: string; label: string }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h1 className="font-semibold">Unable to load pharmacy data</h1>
      <p className="mt-2 text-sm">
        The database could not load {label} (error {code}). Confirm that
        clinic-platform.sql and clinic-patient-registration.sql have been
        applied in the Supabase SQL Editor, then refresh this page.
      </p>
    </section>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66]';
