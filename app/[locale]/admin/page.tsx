import type { Metadata } from 'next';
import { BackLink } from '@/components/BackLink';
import { PageShell } from '@/components/ui';
import { ModerationQueue } from '@/features/moderation/ModerationQueue';
import { defaultLocale, hasLocale } from '@/i18n/config';
import { getTranslate } from '@/i18n/dictionaries';

type Props = PageProps<'/[locale]/admin'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslate(hasLocale(locale) ? locale : defaultLocale);
  return { title: t('admin.title'), robots: { index: false } };
}

export default async function AdminPage({ params }: Props) {
  const { locale: param } = await params;
  const locale = hasLocale(param) ? param : defaultLocale;
  const t = await getTranslate(locale);

  return (
    <PageShell>
      <main>
        <BackLink href={`/${locale}`} label={t('common.backToMap')} />
        <h1 className="mt-3 mb-6 text-[28px] leading-tight font-bold tracking-tight">
          {t('admin.title')}
        </h1>
        <ModerationQueue />
      </main>
    </PageShell>
  );
}
