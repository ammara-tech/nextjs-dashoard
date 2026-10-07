import { uploadPatientDocument } from '../lib/actions';
import { requireClinicRole } from '../lib/access';
import { fetchPatients } from '../lib/data';

export default async function ClinicDocumentsPage() {
  await requireClinicRole(['owner', 'admin', 'front_desk']);
  const patients = await fetchPatients();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Private bucket; access checked by RLS</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Patient documents</h1>
      </div>
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
        <h2 className="font-semibold">Upload document</h2>
        {patients.length === 0 ? (
          <p className="mt-3 text-sm text-[#727a90]">Add a patient before uploading a document.</p>
        ) : (
          <form action={uploadPatientDocument} className="mt-4 grid gap-4 sm:grid-cols-2">
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
              Category
              <select className={inputClass} name="category" required>
                <option value="identity">Identity</option>
                <option value="clinical_history">Clinical history</option>
                <option value="invoices">Invoices</option>
              </select>
            </label>
            <label className="text-sm text-[#727a90] sm:col-span-2">
              File (PDF, JPEG, PNG; maximum 20 MB)
              <input
                accept="application/pdf,image/jpeg,image/png"
                className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#e8edff] file:px-3 file:py-2`}
                name="file"
                required
                type="file"
              />
            </label>
            <button className={buttonClass}>Upload privately</button>
          </form>
        )}
      </section>
      <p className="text-xs text-[#9298a8]">
        Downloads use short-lived signed links. Do not put patient information
        in document filenames.
      </p>
    </div>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526be8]';
