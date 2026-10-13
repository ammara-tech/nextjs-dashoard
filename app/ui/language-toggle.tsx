'use client';

import { useRouter } from 'next/navigation';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { LANG_COOKIE, languages } from '@/app/lib/i18n';
import { useLang, useT } from './i18n-provider';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const router = useRouter();
  const lang = useLang();
  const t = useT();
  const next = languages.find((item) => item.code !== lang) ?? languages[0];

  return (
    <button
      aria-label={`${t('ui.language')}: ${next.name}`}
      className={`tool-button gap-1 px-2.5 text-xs font-semibold ${className}`}
      data-tour="language"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next.code}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      title={`${t('ui.language')}: ${next.name}`}
      type="button"
    >
      <LanguageIcon className="h-5 w-5" />
      {next.label}
    </button>
  );
}
