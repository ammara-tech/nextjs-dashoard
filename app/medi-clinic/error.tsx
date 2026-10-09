'use client';

import { signOut } from '@/app/lib/actions';

export default function MediClinicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[#e9eaf0] bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold text-[#20263b]">Something went wrong</h1>
      <p className="mt-2 text-sm text-[#727a90]">
        We couldn’t load this page. You can try again, or sign out and sign back
        in.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <button
          className="rounded-xl bg-[#1E4FD8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E2F66]"
          onClick={() => reset()}
          type="button"
        >
          Try again
        </button>
        <form action={signOut}>
          <button
            className="rounded-xl border border-[#e9eaf0] px-4 py-2 text-sm font-medium text-[#626b82] hover:bg-[#f7f8fc]"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
