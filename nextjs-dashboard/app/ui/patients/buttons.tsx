import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { deletePatient } from '@/app/lib/actions';

export function CreatePatient() {
  return (
    <Link
      href="/dashboard/patients/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500"
    >
      <span className="hidden md:block">Add patient</span>
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function UpdatePatient({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/patients/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

export function DeletePatient({ id }: { id: string }) {
  const deletePatientWithId = deletePatient.bind(null, id);
  return (
    <form action={deletePatientWithId}>
      <button type="submit" className="rounded-md border p-2 hover:bg-gray-100">
        <span className="sr-only">Delete</span>
        <TrashIcon className="w-5" />
      </button>
    </form>
  );
}