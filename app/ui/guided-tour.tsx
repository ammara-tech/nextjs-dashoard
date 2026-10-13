'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Lang } from '@/app/lib/i18n';
import { useLang, useT } from './i18n-provider';
import { OPEN_TOUR_EVENT } from './events';

type Step = {
  title: Record<Lang, string>;
  body: Record<Lang, string[]>;
  /** Optional page the step is about. The tour stays open when it is opened. */
  link?: { href: string; label: Record<Lang, string> };
  /** Optional element to highlight, matched on its data-tour attribute. */
  target?: string;
};

const steps: Step[] = [
  {
    title: { en: 'Welcome to the demo', af: 'Welkom by die demonstrasie' },
    body: {
      en: [
        'This site holds three dashboards: the Family Clinic, Medical Aid Care Plans and the Next.js invoice dashboard.',
        'The tour takes about two minutes. Press Next to move on, Back to go back, or Esc to leave at any time.',
        'Everything here is sample data, so you can click anything without breaking it.',
      ],
      af: [
        'Hierdie werf het drie panele: die Familiekliniek, Mediese Fonds-sorgplanne en die Next.js-faktuurpaneel.',
        'Die toer neem ongeveer twee minute. Druk Volgende om aan te gaan, Terug om terug te gaan, of Esc om enige tyd te verlaat.',
        'Alles hier is voorbeelddata, so jy kan enigiets klik sonder om iets te breek.',
      ],
    },
  },
  {
    title: { en: 'Your toolbar', af: 'Jou nutsbalk' },
    target: 'tools',
    body: {
      en: [
        'The round buttons at the top are on every page.',
        'Moon or sun: switch between dark and light mode. Your choice is remembered.',
        'Language: switch between English and Afrikaans.',
        'Bell: live notifications. Sparkle: restart this tour.',
      ],
      af: [
        'Die ronde knoppies bo is op elke bladsy.',
        'Maan of son: wissel tussen donker en lig modus. Jou keuse word onthou.',
        'Taal: wissel tussen Engels en Afrikaans.',
        'Klokkie: lewendige kennisgewings. Vonk: begin hierdie toer weer.',
      ],
    },
  },
  {
    title: { en: 'Three dashboards, one home page', af: 'Drie panele, een tuisblad' },
    link: { href: '/', label: { en: 'Open the home page', af: 'Maak die tuisblad oop' } },
    body: {
      en: [
        'The home page has one card for each dashboard.',
        'Family Clinic (blue): appointments, doctors, reception, pharmacy and patient records.',
        'Medical Aid (teal): Care Plans, payments, invoices and claims.',
        'Next.js dashboard (navy): customers, invoices and revenue.',
      ],
      af: [
        'Die tuisblad het een kaart vir elke paneel.',
        'Familiekliniek (blou): afsprake, dokters, ontvangs, apteek en pasiëntrekords.',
        'Mediese Fonds (blougroen): Sorgplanne, betalings, fakture en eise.',
        'Next.js-paneel (vlootblou): kliënte, fakture en inkomste.',
      ],
    },
  },
  {
    title: { en: 'Pick a role to sign in', af: 'Kies ʼn rol om aan te meld' },
    link: { href: '/clinic-hub', label: { en: 'Open the Family Clinic', af: 'Maak die Familiekliniek oop' } },
    body: {
      en: [
        'The Family Clinic shows different screens for each role: owner, admin, front desk, doctor, pharmacist, stock manager and patient.',
        'Sign in with the demo account for the role you want to see. Each role only sees what it needs.',
        'Tip: open a second browser window to watch two roles at once.',
      ],
      af: [
        'Die Familiekliniek wys ander skerms vir elke rol: eienaar, admin, ontvangs, dokter, apteker, voorraadbestuurder en pasiënt.',
        'Meld aan met die demo-rekening vir die rol wat jy wil sien. Elke rol sien net wat dit nodig het.',
        'Wenk: maak ʼn tweede blaaiervenster oop om twee rolle gelyktydig te sien.',
      ],
    },
  },
  {
    title: { en: 'A doctor’s day', af: 'ʼn Dokter se dag' },
    body: {
      en: [
        'Doctors choose which doctor they are, then see today’s schedule, the next 7 days and a chart of the week.',
        'Hover over any bar or slice of a chart to see a card with the exact numbers.',
        'The Calendar page shows the whole week as a grid, with the doctor’s available hours shaded.',
      ],
      af: [
        'Dokters kies watter dokter hulle is, en sien dan vandag se skedule, die volgende 7 dae en ʼn grafiek van die week.',
        'Beweeg oor enige staaf of skyf van ʼn grafiek om ʼn kaart met die presiese syfers te sien.',
        'Die Kalender-bladsy wys die hele week as ʼn rooster, met die dokter se beskikbare ure geskakeer.',
      ],
    },
  },
  {
    title: { en: 'Running the clinic', af: 'Bestuur van die kliniek' },
    body: {
      en: [
        'Admins and the owner manage patients, appointments, providers and pharmacy stock.',
        'On Providers and Shifts they can change when each doctor is available.',
        'In Pharmacy they can add inventory items. In Payments, every payment has a PDF invoice that is created automatically.',
      ],
      af: [
        'Admins en die eienaar bestuur pasiënte, afsprake, verskaffers en apteekvoorraad.',
        'Op Verskaffers en Skofte kan hulle verander wanneer elke dokter beskikbaar is.',
        'In die Apteek kan hulle voorraad byvoeg. By Betalings het elke betaling ʼn PDF-faktuur wat outomaties geskep word.',
      ],
    },
  },
  {
    title: { en: 'The patient view', af: 'Die pasiëntaansig' },
    body: {
      en: [
        'Patients book appointments, see their documents and download their invoices.',
        'They can also edit their own profile: name, phone number, email and date of birth.',
        'Patients only ever see their own records.',
      ],
      af: [
        'Pasiënte bespreek afsprake, sien hul dokumente en laai hul fakture af.',
        'Hulle kan ook hul eie profiel wysig: naam, foonnommer, e-pos en geboortedatum.',
        'Pasiënte sien net hul eie rekords.',
      ],
    },
    link: { href: '/medi-clinic/portal', label: { en: 'Open the patient portal', af: 'Maak die pasiëntportaal oop' } },
  },
  {
    title: { en: 'Medical Aid: plans, payments and claims', af: 'Mediese Fonds: planne, betalings en eise' },
    link: { href: '/medical-aid', label: { en: 'Open Medical Aid', af: 'Maak Mediese Fonds oop' } },
    body: {
      en: [
        'Members join a Care Plan and choose the card it is paid from.',
        'The plan page shows a progress bar, the next payment date and the full payment schedule.',
        'Claims move through Submitted, In review, Approved or Rejected, and Paid. Staff update the stage and the member sees it right away.',
      ],
      af: [
        'Lede sluit by ʼn Sorgplan aan en kies die kaart waarmee dit betaal word.',
        'Die planbladsy wys ʼn vorderingsbalk, die volgende betaaldatum en die volle betalingskedule.',
        'Eise beweeg deur Ingedien, Onder hersiening, Goedgekeur of Afgekeur, en Betaal. Personeel werk die stadium by en die lid sien dit dadelik.',
      ],
    },
  },
  {
    title: { en: 'Live updates and shortcuts', af: 'Lewendige opdaterings en kortpaaie' },
    target: 'notifications',
    body: {
      en: [
        'When something changes, like a new appointment, a payment or a claim update, the page refreshes by itself and the bell shows a notification.',
        'Press ? to see every keyboard shortcut.',
        'Quick keys: T for theme, L for language, G then O, P, A or C to jump to a page.',
      ],
      af: [
        'Wanneer iets verander, soos ʼn nuwe afspraak, ʼn betaling of ʼn eis, verfris die bladsy vanself en wys die klokkie ʼn kennisgewing.',
        'Druk ? om elke sleutelbordkortpad te sien.',
        'Vinnige sleutels: T vir tema, L vir taal, G dan O, P, A of C om na ʼn bladsy te spring.',
      ],
    },
  },
  {
    title: { en: 'You are ready', af: 'Jy is gereed' },
    body: {
      en: [
        'That is the whole tour. Explore any role and any page.',
        'You can restart the tour at any time with the sparkle button in the toolbar.',
      ],
      af: [
        'Dit is die hele toer. Verken enige rol en enige bladsy.',
        'Jy kan die toer enige tyd herbegin met die vonkknoppie in die nutsbalk.',
      ],
    },
  },
];

const STORAGE_KEY = 'tour-state';
const SEEN_KEY = 'tour-seen';

type Box = { top: number; left: number; width: number; height: number };

export default function GuidedTour() {
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [nudge, setNudge] = useState(false);

  // Restore progress when navigating inside the tour, and open on request.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as
        | { open: boolean; index: number }
        | null;
      if (saved?.open) {
        setIndex(Math.min(saved.index, steps.length - 1));
        setOpen(true);
      } else if (window.location.pathname === '/' && !localStorage.getItem(SEEN_KEY)) {
        setNudge(true);
      }
    } catch {
      // Storage may be blocked; the tour still works for this page.
    }
    function onOpen() {
      setIndex(0);
      setOpen(true);
      setNudge(false);
    }
    window.addEventListener(OPEN_TOUR_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, onOpen);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ open, index }));
      if (open) localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // ignore
    }
  }, [open, index]);

  const step = steps[index];

  // Highlight the target element when the step has one on this page.
  useLayoutEffect(() => {
    if (!open || !step.target) {
      setBox(null);
      return;
    }
    function measure() {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) {
        setBox(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setBox({
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(value + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(value - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) {
    return nudge ? (
      <div className="fixed bottom-5 right-5 z-[70] flex max-w-xs items-start gap-3 rounded-2xl border border-[#dbe3ff] bg-white p-4 shadow-xl">
        <SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#1E4FD8]" />
        <div className="text-sm">
          <p className="font-semibold text-[#0F172A]">
            {lang === 'af' ? 'Nuut hier?' : 'New here?'}
          </p>
          <p className="mt-1 text-[#64748B]">
            {lang === 'af'
              ? 'Neem ʼn kort toer van twee minute.'
              : 'Take a two minute guided tour.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg bg-[#1E4FD8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E2F66]"
              onClick={() => {
                setNudge(false);
                setIndex(0);
                setOpen(true);
              }}
              type="button"
            >
              {t('ui.tour')}
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#f7f8fc]"
              onClick={() => {
                setNudge(false);
                try {
                  localStorage.setItem(SEEN_KEY, '1');
                } catch {
                  // ignore
                }
              }}
              type="button"
            >
              {t('ui.close')}
            </button>
          </div>
        </div>
      </div>
    ) : null;
  }

  const last = index === steps.length - 1;

  return (
    <>
      {box ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[70] rounded-2xl ring-4 ring-[#5B7FFF] transition-all"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.45)',
          }}
        />
      ) : null}
      <aside
        aria-label={t('ui.tour')}
        className="fixed bottom-4 left-4 right-4 z-[75] rounded-2xl border border-[#dbe3ff] bg-white p-5 shadow-2xl sm:left-auto sm:right-5 sm:w-[24rem]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1E4FD8]">
            {t('ui.step')} {index + 1} {t('ui.of')} {steps.length}
          </p>
          <button
            aria-label={t('ui.close')}
            className="-mr-1 -mt-1 rounded-lg p-1 text-[#8b91a3] hover:bg-[#f7f8fc]"
            onClick={() => setOpen(false)}
            type="button"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF2FF]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1E4FD8] to-[#5B7FFF] transition-all"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#0F172A]">{step.title[lang]}</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#404960]">
          {step.body[lang].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {step.link ? (
          <Link
            className="mt-3 inline-block text-sm font-semibold text-[#1E4FD8] underline-offset-2 hover:underline"
            href={step.link.href}
          >
            {step.link.label[lang]} →
          </Link>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            className="text-xs font-medium text-[#8b91a3] hover:text-[#1E2F66]"
            onClick={() => setOpen(false)}
            type="button"
          >
            {t('ui.skip')}
          </button>
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-[#e3e8f5] px-4 py-2 text-sm font-medium text-[#1E2F66] hover:bg-[#EEF2FF] disabled:opacity-40"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              type="button"
            >
              {t('ui.back')}
            </button>
            <button
              className="rounded-xl bg-[#1E4FD8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E2F66]"
              onClick={() => (last ? setOpen(false) : setIndex(index + 1))}
              type="button"
            >
              {last ? t('ui.done') : t('ui.next')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
