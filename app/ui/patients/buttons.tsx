import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { deletePatient } from '@/app/lib/actions';

export function UpdatePatient({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/patients/${id}/edit`}
      aria-label="Edit patient"
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
      <button
        type="submit"
        aria-label="Delete patient"
        className="rounded-md border p-2 hover:bg-gray-100"
      >
        <TrashIcon className="w-5" />
      </button>
    </form>
  );
}
