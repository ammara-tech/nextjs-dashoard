import { fetchPatients } from '@/app/lib/data';
import { CreatePatient, UpdatePatient, DeletePatient } from '@/app/ui/patients/buttons';
import { lusitana } from '@/app/ui/fonts';

export default async function Page() {
  const patients = await fetchPatients();

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Patients</h1>
        <CreatePatient />
      </div>

      {patients.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No patients yet. Add the first one.</p>
      ) : (
        <table className="mt-6 min-w-full text-gray-900">
          <thead className="text-left text-sm font-normal">
            <tr>
              <th className="px-4 py-3 font-medium">Full name</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Date of birth</th>
              <th className="py-3 pl-6 pr-3"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {patients.map((p) => (
              <tr key={p.id} className="border-b text-sm">
                <td className="whitespace-nowrap px-4 py-3">{p.full_name}</td>
                <td className="whitespace-nowrap px-3 py-3">{p.phone ?? ''}</td>
                <td className="whitespace-nowrap px-3 py-3">{p.date_of_birth ?? ''}</td>
                <td className="whitespace-nowrap py-3 pl-6 pr-3">
                  <div className="flex justify-end gap-3">
                    <UpdatePatient id={p.id} />
                    <DeletePatient id={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}