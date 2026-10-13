'use client';

import { createContext, useContext } from 'react';
import { translate, type Key, type Lang } from '@/app/lib/i18n';

const LangContext = createContext<Lang>('en');

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Client-side translator: `const t = useT(); t('nav.overview')`. */
export function useT() {
  const lang = useContext(LangContext);
  return (key: Key) => translate(lang, key);
}
