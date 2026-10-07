import { updateSupportRequestStatus } from '../lib/actions';
import { requireClinicRole } from '../lib/access';

export default async function ClinicEnquiriesPage() {
  const { supabase } = await requireClinicRole(['owner', 'admin', 'front_desk']);
  const { data, error } = await supabase
    .from('clinic_support_requests')
    .select('id, patient_id, subject, message, status, created_at, patients!inner(full_name, phone)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('Supabase clinic support queue error:', error);
    throw new Error('Unable to load patient enquiries.');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Non-urgent patient messages</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Patient enquiries</h1>
      </div>
      {(data ?? []).length === 0 ? (
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5 text-sm text-[#727a90]">
          No patient enquiries.
        </section>
      ) : (
        <section className="space-y-4">
          {(data ?? []).map((request) => (
            <article className="rounded-2xl border border-[#e9eaf0] bg-white p-5" key={request.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{request.subject}</h2>
                  <p className="text-sm text-[#727a90]">
                    {request.patients[0]?.full_name ?? 'Patient'}
                    {request.patients[0]?.phone
                      ? ` · ${request.patients[0].phone}`
                      : ''}
                    {' · '}{new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm capitalize text-[#727a90]">
                  {request.status.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm">{request.message}</p>
              <form action={updateSupportRequestStatus} className="mt-4 flex flex-wrap gap-2">
                <input name="request_id" type="hidden" value={request.id} />
                <select
                  aria-label="Request status"
                  className="rounded-xl border-[#e3e5eb] text-sm"
                  defaultValue={request.status}
                  name="status"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button className="rounded-xl border border-[#e3e5eb] px-4 py-2 text-sm font-semibold">
                  Update status
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
