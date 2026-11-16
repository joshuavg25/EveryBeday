import type { Metadata } from 'next';
import { BackLink } from '@/components/BackLink';
import { PageShell } from '@/components/ui';
import { AddToiletForm } from '@/features/toilets/AddToiletForm';
import { defaultLocale, hasLocale } from '@/i18n/config';
import { getTranslate } from '@/i18n/dictionaries';

type Props = PageProps<'/[locale]/add'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslate(hasLocale(locale) ? locale : defaultLocale);
  return { title: t('add.title'), robots: { index: false } };
}

export default async function AddPage({ params }: Props) {
  const { locale: param } = await params;
  const locale = hasLocale(param) ? param : defaultLocale;
  const t = await getTranslate(locale);

  return (
    <PageShell>
      <main>
        <BackLink href={`/${locale}`} label={t('common.backToMap')} />
        <h1 className="mt-3 mb-6 text-[28px] leading-tight font-bold tracking-tight">
          {t('add.title')}
        </h1>
        <AddToiletForm />
      </main>
    </PageShell>
  );
}
