'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/config';
import type { Messages } from '@/i18n/translate';

// Everything client components need from above: the signed-in user and the translations
export function Providers({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
