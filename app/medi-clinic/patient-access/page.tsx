import {
  approvePatientAccessRequest,
  denyPatientAccessRequest,
} from '../lib/actions';
import { requireClinicRole } from '../lib/access';

export default async function PatientAccessRequestsPage() {
  const { supabase } = await requireClinicRole(['owner', 'admin']);
  const { data: requests, error } = await supabase
    .from('clinic_patient_access_requests')
    .select('id, full_name, email, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase patient access requests error:', error);
    throw new Error(
      'Unable to load patient access requests. Confirm clinic-patient-access-requests.sql has been applied.',
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">New patient account requests</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Patient access review
        </h1>
        <p className="mt-2 text-sm text-[#727a90]">
          Approve only after verifying the person. Approval links their account
          to an existing patient record with the same email, or creates a new
          patient record if no match exists.
        </p>
      </div>

      {requests.length === 0 ? (
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 text-sm text-[#727a90]">
          No patient accounts are waiting for review.
        </section>
      ) : (
        <section className="space-y-3">
          {requests.map((request) => (
            <article
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e9eaf0] bg-white p-5"
              key={request.id}
            >
              <div>
                <h2 className="font-semibold">{request.full_name}</h2>
                <p className="mt-1 text-sm text-[#727a90]">{request.email}</p>
                <p className="mt-1 text-xs text-[#9298a8]">
                  Requested {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approvePatientAccessRequest}>
                  <input name="request_id" type="hidden" value={request.id} />
                  <button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Approve access
                  </button>
                </form>
                <form action={denyPatientAccessRequest}>
                  <input name="request_id" type="hidden" value={request.id} />
                  <button className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                    Deny
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
