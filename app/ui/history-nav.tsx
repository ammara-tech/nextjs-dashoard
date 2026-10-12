'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

/**
 * Back, forward and refresh arrows, like the browser's own, so people can move
 * between pages without leaving the page. `floating` pins them to the top left
 * of standalone pages (login, register, hubs); `inline` sits in a header.
 */
export default function HistoryNav({
  variant = 'inline',
  fallbackHref = '/',
  dark = false,
}: {
  variant?: 'inline' | 'floating';
  /** Where "back" goes if there is no earlier page in this tab. */
  fallbackHref?: string;
  /** Use light icons on a dark background. */
  dark?: boolean;
}) {
  const router = useRouter();
  const button = `flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7FFF] ${
    dark
      ? 'text-white/80 hover:bg-white/10 hover:text-white'
      : 'text-[#1E2F66] hover:bg-[#EEF2FF]'
  }`;

  return (
    <nav
      aria-label="Page history"
      className={`flex items-center gap-0.5 rounded-full border ${
        dark ? 'border-white/20 bg-white/5' : 'border-[#e3e8f5] bg-white shadow-sm'
      } p-0.5 ${variant === 'floating' ? 'absolute left-4 top-4 z-40' : ''}`}
    >
      <button
        aria-label="Go back"
        className={button}
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(fallbackHref);
        }}
        title="Back"
        type="button"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>
      <button
        aria-label="Go forward"
        className={button}
        onClick={() => router.forward()}
        title="Forward"
        type="button"
      >
        <ArrowRightIcon className="h-5 w-5" />
      </button>
      <button
        aria-label="Refresh page"
        className={button}
        onClick={() => router.refresh()}
        title="Refresh"
        type="button"
      >
        <ArrowPathIcon className="h-5 w-5" />
      </button>
    </nav>
  );
}
