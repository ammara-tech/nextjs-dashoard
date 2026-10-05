import CreatePatientForm from '@/app/ui/patients/create-form';

export default function CreatePatientPage() {
  return (
    <main>
      <h1 className="mb-6 text-2xl">Add patient</h1>
      <CreatePatientForm />
    </main>
  );
}
