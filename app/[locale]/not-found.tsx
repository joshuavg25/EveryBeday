import Link from 'next/link';
import { locale as rootLocale } from 'next/root-params';
import { buttonClass, PageShell } from '@/components/ui';
import { defaultLocale, hasLocale } from '@/i18n/config';
import { getTranslate } from '@/i18n/dictionaries';

export default async function NotFound() {
  const param = await rootLocale();
  const locale = param && hasLocale(param) ? param : defaultLocale;
  const t = await getTranslate(locale);

  return (
    <PageShell>
      <main className="pt-16">
        <h1 className="text-2xl font-bold">{t('notFound.title')}</h1>
        <p className="text-ink-soft mt-2">{t('notFound.body')}</p>
        <Link href={`/${locale}`} className={buttonClass('primary', 'mt-6')}>
          {t('common.backToMap')}
        </Link>
      </main>
    </PageShell>
  );
}
