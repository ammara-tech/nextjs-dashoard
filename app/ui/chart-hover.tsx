'use client';

import { useRef, useState } from 'react';

export type ChartTip = {
  title: string;
  /** Rows of label and value shown in the card. */
  rows: { label: string; value: string; color?: string }[];
  /** Optional small line under the rows. */
  footnote?: string;
};

/** Builds the value of a `data-tip` attribute for an element inside a ChartHoverArea. */
export const tip = (value: ChartTip) => JSON.stringify(value);

type Active = { tip: ChartTip; x: number; y: number; flip: boolean };

/**
 * Wrap any chart in this. Every element inside with a `data-tip` attribute
 * (see `tip()`) shows a card with its statistics when hovered, focused with the
 * keyboard, or tapped. The charts themselves stay server components.
 */
export default function ChartHoverArea({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Active | null>(null);

  function read(target: EventTarget | null): ChartTip | null {
    const el = (target as HTMLElement | null)?.closest?.('[data-tip]') as HTMLElement | null;
    if (!el || !box.current?.contains(el)) return null;
    try {
      return JSON.parse(el.dataset.tip ?? '') as ChartTip;
    } catch {
      return null;
    }
  }

  function place(tipValue: ChartTip, clientX: number, clientY: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    setActive({
      tip: tipValue,
      x,
      y: clientY - rect.top,
      flip: x > rect.width - 230,
    });
  }

  return (
    <div
      className={`relative ${className}`}
      onBlur={() => setActive(null)}
      onClick={(event) => {
        const found = read(event.target);
        if (found) place(found, event.clientX, event.clientY);
      }}
      onFocus={(event) => {
        const found = read(event.target);
        if (!found) return;
        const r = (event.target as HTMLElement).getBoundingClientRect();
        place(found, r.left + r.width / 2, r.top + r.height / 2);
      }}
      onMouseLeave={() => setActive(null)}
      onMouseMove={(event) => {
        const found = read(event.target);
        if (found) place(found, event.clientX, event.clientY);
        else setActive(null);
      }}
      ref={box}
    >
      {children}
      {active ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 w-52 rounded-xl border border-[#e3e8f5] bg-white p-3 text-left shadow-xl shadow-[#1E2F66]/15"
          style={{
            left: active.x,
            top: active.y,
            transform: `translate(${active.flip ? 'calc(-100% - 14px)' : '14px'}, 14px)`,
          }}
        >
          <p className="text-sm font-semibold text-[#0F172A]">{active.tip.title}</p>
          <dl className="mt-2 space-y-1.5">
            {active.tip.rows.map((row) => (
              <div className="flex items-center justify-between gap-3 text-xs" key={row.label}>
                <dt className="flex items-center gap-1.5 text-[#64748B]">
                  {row.color ? (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                  ) : null}
                  {row.label}
                </dt>
                <dd className="font-semibold text-[#0F172A]">{row.value}</dd>
              </div>
            ))}
          </dl>
          {active.tip.footnote ? (
            <p className="mt-2 border-t border-[#eff0f4] pt-2 text-[11px] text-[#8b91a3]">
              {active.tip.footnote}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
