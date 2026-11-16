import 'server-only';
import type { Locale } from './config';
import { createTranslate, type Messages } from './translate';

const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: () => import('@/messages/en.json').then((m) => m.default),
  ko: () => import('@/messages/ko.json').then((m) => m.default),
};

export const getMessages = (locale: Locale) => dictionaries[locale]();

// For Server Components: const t = await getTranslate(locale)
export async function getTranslate(locale: Locale) {
  return createTranslate(await getMessages(locale));
}
