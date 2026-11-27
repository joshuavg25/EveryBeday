import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '../globals.css';
import { Providers } from '@/components/Providers';
import { ThemeScript } from '@/components/ThemeScript';
import { hasLocale, locales } from '@/i18n/config';
import { getMessages, getTranslate } from '@/i18n/dictionaries';

// Build one static shell per language
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTranslate(locale);
  return {
    title: { default: t('meta.title'), template: `%s | ${t('common.appName')}` },
    description: t('meta.description'),
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b8a83' },
    { media: '(prefers-color-scheme: dark)', color: '#086f69' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeScript />
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
