'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createInventoryItem, type InventoryItemState } from '../lib/actions';

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';

export default function InventoryItemForm({
  items,
}: {
  items: { id: string; name: string; sku: string | null }[];
}) {
  const [state, action, pending] = useActionState<InventoryItemState, FormData>(
    createInventoryItem,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <div>
      <form
        action={action}
        className="mt-4 grid gap-3 sm:grid-cols-2"
        ref={formRef}
      >
        <label className="text-sm text-[#727a90]">
          Item name
          <input className={inputClass} maxLength={160} name="name" required />
        </label>
        <label className="text-sm text-[#727a90]">
          SKU (optional)
          <input className={inputClass} maxLength={80} name="sku" />
        </label>
        <button
          className="rounded-xl bg-[#1E4FD8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1E2F66] disabled:opacity-60 sm:col-span-2"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Adding…' : 'Add item'}
        </button>
        {state.message ? (
          <p
            aria-live="polite"
            className={`text-sm sm:col-span-2 ${state.success ? 'text-emerald-700' : 'text-red-600'}`}
            role={state.success ? 'status' : 'alert'}
          >
            {state.message}
          </p>
        ) : null}
      </form>
      {items.length > 0 ? (
        <div className="mt-4 border-t border-[#eff0f4] pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8b91a3]">
            In stock list ({items.length})
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {items.map((item) => (
              <li
                className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#1E2F66]"
                key={item.id}
              >
                {item.name}
                {item.sku ? <span className="text-[#727a90]"> · {item.sku}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
