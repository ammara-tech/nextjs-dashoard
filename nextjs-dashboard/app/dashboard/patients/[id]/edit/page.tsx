import { notFound } from 'next/navigation';
import { fetchPatientById } from '@/app/lib/data';
import EditForm from '@/app/ui/patients/edit-form';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const patient = await fetchPatientById(id);

  if (!patient) {
    notFound();
  }

  return (
    <main>
      <h1 className="mb-6 text-2xl">Edit patient</h1>
      <EditForm patient={patient} />
    </main>
  );
}