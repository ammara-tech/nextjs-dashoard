'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';
import type { Lang } from '@/app/lib/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLang, useT } from './i18n-provider';

const STORE_KEY = 'clinic-notifications';
const NOTIFY_EVENT = 'clinic:notify';
const LIVE_EVENT = 'clinic:live';

type Note = { id: string; title: string; body: string; at: number; read: boolean };

function readStore(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as Note[];
  } catch {
    return [];
  }
}

function writeStore(notes: Note[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(notes.slice(0, 30)));
  } catch {
    // Storage may be blocked; notifications then last only for this page.
  }
  window.dispatchEvent(new Event(NOTIFY_EVENT));
}

function push(title: string, body: string) {
  writeStore([
    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, body, at: Date.now(), read: false },
    ...readStore(),
  ]);
}

const money = (minor: unknown) =>
  typeof minor === 'number' ? `R${(minor / 100).toFixed(2)}` : '';

type Row = Record<string, unknown>;

function describe(
  table: string,
  event: string,
  row: Row,
  lang: Lang,
): { title: string; body: string } | null {
  const af = lang === 'af';
  const status = typeof row.status === 'string' ? row.status : '';
  if (table === 'appointments') {
    if (event === 'INSERT') {
      return {
        title: af ? 'Nuwe afspraak' : 'New appointment',
        body: af ? 'ʼn Afspraak is bespreek.' : 'An appointment was booked.',
      };
    }
    return {
      title: af ? 'Afspraak opgedateer' : 'Appointment updated',
      body: af ? `Status: ${status}` : `Status is now ${status.replace('_', ' ')}.`,
    };
  }
  if (table === 'clinic_care_plan_payments' && event === 'INSERT') {
    return {
      title: af ? 'Betaling ontvang' : 'Payment received',
      body: `${money(row.amount_minor)} ${af ? 'vir' : 'for'} ${String(row.plan_code ?? 'Care Plan')}`.trim(),
    };
  }
  if (table === 'clinic_care_plan_memberships') {
    return {
      title: af ? 'Sorgplan opgedateer' : 'Care Plan updated',
      body:
        event === 'INSERT'
          ? af ? 'ʼn Nuwe lid het aangesluit.' : 'A member joined a plan.'
          : status === 'cancelled'
            ? af ? 'ʼn Plan is gekanselleer.' : 'A plan was cancelled.'
            : af ? 'ʼn Plan is verander.' : 'A plan was changed.',
    };
  }
  if (table === 'clinic_claims') {
    return {
      title: af ? 'Eis opgedateer' : 'Claim updated',
      body:
        event === 'INSERT'
          ? af ? 'ʼn Nuwe eis is ingedien.' : 'A new claim was submitted.'
          : af ? `Eis is nou: ${status}` : `Claim is now ${status.replace('_', ' ')}.`,
    };
  }
  return null;
}

const watched = [
  'appointments',
  'clinic_care_plan_payments',
  'clinic_care_plan_memberships',
  'clinic_claims',
];

/** Subscribes to live database changes, refreshes the page and adds a notification. */
export function RealtimeNotifier() {
  const router = useRouter();
  const lang = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    let refreshTimer: number | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      let next = supabase.channel('clinic-live');
      for (const table of watched) {
        next = next.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            const note = describe(
              table,
              payload.eventType,
              (payload.new ?? payload.old ?? {}) as Row,
              langRef.current,
            );
            if (note) push(note.title, note.body);
            window.clearTimeout(refreshTimer);
            refreshTimer = window.setTimeout(() => router.refresh(), 500);
          },
        );
      }
      channel = next.subscribe((status) => {
        window.dispatchEvent(
          new CustomEvent(LIVE_EVENT, { detail: status === 'SUBSCRIBED' }),
        );
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}

function ago(at: number, lang: Lang) {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return lang === 'af' ? 'nou' : 'just now';
  if (minutes < 60) return lang === 'af' ? `${minutes} min gelede` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return lang === 'af' ? `${hours} uur gelede` : `${hours}h ago`;
  return new Date(at).toLocaleDateString(lang === 'af' ? 'af-ZA' : 'en-GB');
}

export default function NotificationBell({ className = '' }: { className?: string }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [live, setLive] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setNotes(readStore());
    const onLive = (event: Event) => setLive(Boolean((event as CustomEvent).detail));
    sync();
    window.addEventListener(NOTIFY_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener(LIVE_EVENT, onLive);
    return () => {
      window.removeEventListener(NOTIFY_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener(LIVE_EVENT, onLive);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const unread = notes.filter((note) => !note.read).length;

  return (
    <div className="relative" data-tour="notifications" ref={box}>
      <button
        aria-expanded={open}
        aria-label={`${t('ui.notifications')}${unread ? ` (${unread})` : ''}`}
        className={`tool-button relative ${className}`}
        onClick={() => setOpen((value) => !value)}
        title={t('ui.notifications')}
        type="button"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
        {live ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
          />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#e3e8f5] bg-white text-left shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#e9eaf0] px-4 py-3">
            <p className="text-sm font-semibold text-[#0F172A]">{t('ui.notifications')}</p>
            <div className="flex gap-3 text-xs font-medium text-[#1E4FD8]">
              <button
                onClick={() => writeStore(notes.map((note) => ({ ...note, read: true })))}
                type="button"
              >
                {t('ui.markAllRead')}
              </button>
              <button onClick={() => writeStore([])} type="button">
                {t('ui.clear')}
              </button>
            </div>
          </div>
          <ul className="max-h-80 divide-y divide-[#eff0f4] overflow-y-auto">
            {notes.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[#7b8296]">
                {t('ui.noNotifications')}
              </li>
            ) : (
              notes.map((note) => (
                <li
                  className={`px-4 py-3 text-sm ${note.read ? '' : 'bg-[#EEF2FF]'}`}
                  key={note.id}
                >
                  <p className="font-semibold text-[#20263b]">{note.title}</p>
                  <p className="text-[#727a90]">{note.body}</p>
                  <p className="mt-0.5 text-xs text-[#8b91a3]">{ago(note.at, lang)}</p>
                </li>
              ))
            )}
          </ul>
          {live ? (
            <p className="border-t border-[#e9eaf0] px-4 py-2 text-xs text-emerald-600">
              ● {t('ui.live')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
