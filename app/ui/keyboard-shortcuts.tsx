'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LANG_COOKIE } from '@/app/lib/i18n';
import { useLang, useT } from './i18n-provider';
import { setTheme } from './theme-toggle';

// "G" then a letter jumps to a page. Clinic pages are only used when the
// signed-in role actually has that link in its navigation bar.
const chords: Record<string, string> = {
  o: '/medi-clinic',
  p: '/medi-clinic/patients',
  a: '/medi-clinic/appointments',
  c: '/medi-clinic/calendar',
  s: '/medi-clinic/shifts',
  m: '/medical-aid/dashboard',
  h: '/',
};

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function allowed(href: string) {
  if (href === '/' || href.startsWith('/medical-aid')) return true;
  return Boolean(
    document.querySelector(`nav[aria-label="Clinic dashboard"] a[href="${href}"]`),
  );
}

/** Single-key shortcuts: T theme, L language, ? help, G then a letter to jump. */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const lang = useLang();
  const t = useT();
  const [help, setHelp] = useState(false);
  const chord = useRef<number | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setHelp(false);
        return;
      }
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

      if (chord.current) {
        window.clearTimeout(chord.current);
        chord.current = null;
        const href = chords[event.key.toLowerCase()];
        if (href && allowed(href)) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }
      const key = event.key.toLowerCase();
      if (event.key === '?') {
        event.preventDefault();
        setHelp((value) => !value);
      } else if (key === 'g') {
        chord.current = window.setTimeout(() => {
          chord.current = null;
        }, 1200);
      } else if (key === 't') {
        setTheme(!document.documentElement.classList.contains('dark'));
      } else if (key === 'l') {
        document.cookie = `${LANG_COOKIE}=${lang === 'en' ? 'af' : 'en'}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lang, router]);

  if (!help) return null;

  const rows: [string, string][] = [
    ['?', t('ui.shortcuts')],
    ['T', t('ui.theme')],
    ['L', t('ui.language')],
    ['G  then  O', t('nav.overview')],
    ['G  then  P', t('nav.patients')],
    ['G  then  A', t('nav.appointments')],
    ['G  then  C', t('nav.calendar')],
    ['G  then  S', t('nav.shifts')],
    ['G  then  M', 'Medical Aid'],
    ['G  then  H', lang === 'af' ? 'Tuis' : 'Home'],
    ['Esc', t('ui.close')],
  ];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setHelp(false);
      }}
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#e3e8f5] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0F172A]">{t('ui.shortcuts')}</h2>
          <button
            className="rounded-lg px-2 py-1 text-sm text-[#7b8296] hover:bg-[#f7f8fc]"
            onClick={() => setHelp(false)}
            type="button"
          >
            {t('ui.close')}
          </button>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          {rows.map(([keys, label]) => (
            <div className="flex items-center justify-between gap-4" key={keys + label}>
              <dt className="text-[#404960]">{label}</dt>
              <dd>
                <kbd className="rounded-md border border-[#e3e8f5] bg-[#f7f8fc] px-2 py-0.5 text-xs font-medium text-[#1E2F66]">
                  {keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
