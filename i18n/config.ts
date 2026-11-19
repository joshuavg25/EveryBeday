export const locales = ['en', 'ko'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// Cookie that remembers the language the user picked
export const LOCALE_COOKIE = 'locale';

export const localeNames: Record<Locale, string> = { en: 'English', ko: '한국어' };

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
