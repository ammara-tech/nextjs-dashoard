'use client';

export default function MedicalAidDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold">We could not load your care plans</h1>
      <p className="mt-2 text-sm text-[#727a90]">
        Something went wrong while loading this page. Try again, and contact the
        clinic if it keeps happening.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-[#9298a8]">Reference: {error.digest}</p>
      ) : null}
      <button
        className="mt-4 rounded-xl bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0F766E]"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
