import 'server-only';

import { cookies } from 'next/headers';
import { LANG_COOKIE, normaliseLang, translate, type Key, type Lang } from './i18n';

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normaliseLang(store.get(LANG_COOKIE)?.value);
}

/** Server-side translator: `const t = await getT(); t('nav.overview')`. */
export async function getT() {
  const lang = await getLang();
  return { lang, t: (key: Key) => translate(lang, key) };
}
