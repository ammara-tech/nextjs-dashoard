// Shown instantly while a clinic page loads, so moving between pages feels
// responsive instead of freezing on the previous screen.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-[#e9eaf0]" />
        <div className="h-8 w-72 rounded bg-[#e9eaf0]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-28 rounded-2xl bg-white shadow-sm" key={item} />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}
