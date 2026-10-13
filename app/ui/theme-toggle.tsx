'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useT } from './i18n-provider';

export const THEME_KEY = 'theme';

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function setTheme(dark: boolean) {
  applyTheme(dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useT();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const Icon = dark ? SunIcon : MoonIcon;
  const label = dark ? t('ui.themeLight') : t('ui.themeDark');

  return (
    <button
      aria-label={label}
      className={`tool-button ${className}`}
      data-tour="theme"
      onClick={() => {
        setTheme(!dark);
        setDark(!dark);
      }}
      title={label}
      type="button"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
