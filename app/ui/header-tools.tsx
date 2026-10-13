'use client';

import { SparklesIcon } from '@heroicons/react/24/outline';
import LanguageToggle from './language-toggle';
import NotificationBell from './notifications';
import ThemeToggle from './theme-toggle';
import { useT } from './i18n-provider';
import { OPEN_TOUR_EVENT } from './events';

/**
 * The round toolbar buttons: tour, notifications, language and theme.
 * `floating` pins them to the top right of standalone pages; `inline` sits in a header.
 */
export default function HeaderTools({
  variant = 'inline',
  showNotifications = true,
}: {
  variant?: 'inline' | 'floating';
  showNotifications?: boolean;
}) {
  const t = useT();
  return (
    <div
      className={`flex items-center gap-3.5 ${
        variant === 'floating' ? 'absolute right-4 top-4 z-40' : ''
      }`}
      data-tour="tools"
    >
      <button
        aria-label={t('ui.tour')}
        className="tool-button"
        onClick={() => window.dispatchEvent(new Event(OPEN_TOUR_EVENT))}
        title={t('ui.tour')}
        type="button"
      >
        <SparklesIcon className="h-5 w-5" />
      </button>
      {showNotifications ? <NotificationBell /> : null}
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
