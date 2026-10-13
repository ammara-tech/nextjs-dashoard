'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { LANG_COOKIE, translate, type Key } from '@/app/lib/i18n';
import { publicItems, type NavItem } from '@/app/lib/nav-items';
import { useLang, useT } from './i18n-provider';
import { setTheme } from './theme-toggle';

export const OPEN_SEARCH_EVENT = 'clinic:open-search';
export const OPEN_TOUR_EVENT = 'clinic:open-tour';

type Remote = {
  role: string | null;
  pages: NavItem[];
  patients: { id: string; full_name: string; patient_number: string | null }[];
};

type Item = {
  id: string;
  group: 'ui.searchPages' | 'ui.searchPatients' | 'ui.searchActions';
  label: string;
  hint?: string;
  run: () => void;
};

const chords: Record<string, string> = {
  o: '/medi-clinic',
  p: '/medi-clinic/patients',
  a: '/medi-clinic/appointments',
  c: '/medi-clinic/calendar',
  s: '/medi-clinic/shifts',
  m: '/medical-aid/dashboard',
  h: '/',
};

const shortcutRows: { keys: string; key: Key }[] = [
  { keys: 'Ctrl + K  or  /', key: 'ui.search' },
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function CommandPalette() {
  const router = useRouter();
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<Remote>({ role: null, pages: [], patients: [] });
  const loaded = useRef(false);
  const chord = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async (q: string) => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      });
      if (response.ok) setRemote((await response.json()) as Remote);
      loaded.current = true;
    } catch {
      // Search still works with the public pages and actions.
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    document.cookie = `${LANG_COOKIE}=${lang === 'en' ? 'af' : 'en'}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [lang, router]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  // Global keyboard shortcuts.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === 'Escape') {
        setOpen(false);
        setHelp(false);
        return;
      }
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

      if (chord.current) {
        window.clearTimeout(chord.current);
        chord.current = null;
        const href = chords[event.key.toLowerCase()];
        if (href) {
          event.preventDefault();
          const allowed =
            href === '/' || remote.pages.some((page) => page.href === href);
          if (allowed) router.push(href);
        }
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === '?') {
        event.preventDefault();
        setHelp((value) => !value);
      } else if (event.key.toLowerCase() === 'g') {
        if (!loaded.current) void load('');
        chord.current = window.setTimeout(() => {
          chord.current = null;
        }, 1200);
      } else if (event.key.toLowerCase() === 't') {
        setTheme(!document.documentElement.classList.contains('dark'));
      } else if (event.key.toLowerCase() === 'l') {
        toggleLanguage();
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, [load, remote.pages, router, toggleLanguage]);

  // Load the role's pages when the palette opens, and patients while typing.
  useEffect(() => {
    if (!open) return;
    setActive(0);
    input.current?.focus();
    const timer = window.setTimeout(() => void load(query), query ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [open, query, load]);

  const items = useMemo<Item[]>(() => {
    const needle = query.trim().toLowerCase();
    const matches = (text: string) => !needle || text.toLowerCase().includes(needle);
    const list: Item[] = [];

    const pages =
      remote.pages.length > 0
        ? remote.pages.map((page) => ({
            href: page.href,
            label: translate(lang, page.key),
          }))
        : publicItems.map((page) => ({ href: page.href, label: page.label[lang] }));
    for (const page of pages) {
      if (matches(page.label)) {
        list.push({
          id: `page-${page.href}`,
          group: 'ui.searchPages',
          label: page.label,
          hint: page.href,
          run: () => go(page.href),
        });
      }
    }
    for (const patient of remote.patients) {
      list.push({
        id: `patient-${patient.id}`,
        group: 'ui.searchPatients',
        label: patient.full_name,
        hint: patient.patient_number ?? undefined,
        run: () => go('/medi-clinic/patients'),
      });
    }
    const actions: { id: string; label: string; hint?: string; run: () => void }[] = [
      {
        id: 'act-theme',
        label: t('ui.theme'),
        hint: 'T',
        run: () => {
          setTheme(!document.documentElement.classList.contains('dark'));
          setOpen(false);
        },
      },
      {
        id: 'act-lang',
        label: t('ui.language'),
        hint: 'L',
        run: () => {
          toggleLanguage();
          setOpen(false);
        },
      },
      {
        id: 'act-tour',
        label: t('ui.tour'),
        run: () => {
          setOpen(false);
          window.dispatchEvent(new Event(OPEN_TOUR_EVENT));
        },
      },
      {
        id: 'act-help',
        label: t('ui.shortcuts'),
        hint: '?',
        run: () => {
          setOpen(false);
          setHelp(true);
        },
      },
    ];
    for (const action of actions) {
      if (matches(action.label)) {
        list.push({ ...action, group: 'ui.searchActions' });
      }
    }
    return list;
  }, [go, lang, query, remote, t, toggleLanguage]);

  function onInputKey(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[active]?.run();
    }
  }

  const groups = (['ui.searchPages', 'ui.searchPatients', 'ui.searchActions'] as const)
    .map((group) => ({ group, entries: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.entries.length > 0);

  return (
    <>
      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-start justify-center bg-[#0F172A]/60 p-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="dialog"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#e3e8f5] bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#e9eaf0] px-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-[#8b91a3]" />
              <input
                aria-label={t('ui.search')}
                className="h-14 w-full border-0 bg-transparent text-base focus:ring-0"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKey}
                placeholder={t('ui.searchPlaceholder')}
                ref={input}
                value={query}
              />
              <kbd className="rounded-md border border-[#e3e8f5] px-1.5 py-0.5 text-[11px] text-[#8b91a3]">
                Esc
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {groups.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[#7b8296]">
                  {t('ui.noResults')}
                </p>
              ) : (
                groups.map(({ group, entries }) => (
                  <div className="mb-1" key={group}>
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8b91a3]">
                      {t(group)}
                    </p>
                    {entries.map((item) => {
                      const index = items.indexOf(item);
                      return (
                        <button
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                            index === active
                              ? 'bg-[#EEF2FF] text-[#1E2F66]'
                              : 'text-[#404960] hover:bg-[#f7f8fc]'
                          }`}
                          key={item.id}
                          onClick={item.run}
                          onMouseEnter={() => setActive(index)}
                          type="button"
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="flex items-center gap-2 text-xs text-[#8b91a3]">
                            {item.hint}
                            {index === active ? <ArrowRightIcon className="h-4 w-4" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <p className="border-t border-[#e9eaf0] px-4 py-2.5 text-xs text-[#8b91a3]">
              {t('ui.searchHint')}
            </p>
          </div>
        </div>
      ) : null}

      {help ? (
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
              {[
                ...shortcutRows.map((row) => [row.keys, t(row.key)]),
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
              ].map(([keys, label]) => (
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
      ) : null}
    </>
  );
}
