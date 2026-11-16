'use client';

import { createContext, use, useMemo, type ReactNode } from 'react';
import type { Locale } from './config';
import { createTranslate, type Messages, type Translate } from './translate';

type I18n = { locale: Locale; messages: Messages; t: Translate };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, messages, t: createTranslate(messages) }),
    [locale, messages],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

// For Client Components: const { t, locale } = useI18n()
export function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
