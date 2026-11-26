import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BackLink } from '@/components/BackLink';
import { DirectionsIcon } from '@/components/icons';
import { buttonClass, PageShell } from '@/components/ui';
import { MiniMap } from '@/features/map/MiniMap';
import { ConfirmBidet } from '@/features/toilets/ConfirmBidet';
import { kakaoDirectionsUrl, secondaryName, toiletName } from '@/features/toilets/format';
import { ReportProblem } from '@/features/toilets/ReportProblem';
import { uuidSchema } from '@/features/toilets/schemas';
import { ShareButton } from '@/features/toilets/ShareButton';
import { ToiletInfo } from '@/features/toilets/ToiletInfo';
import { defaultLocale, hasLocale } from '@/i18n/config';
import { getTranslate } from '@/i18n/dictionaries';
import { getToilet } from '@/server/services/toilets';

type Props = PageProps<'/[locale]/toilets/[id]'>;

async function loadToilet(id: string) {
  return uuidSchema.safeParse(id).success ? getToilet(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: param, id } = await params;
  const locale = hasLocale(param) ? param : defaultLocale;
  const t = await getTranslate(locale);
  const toilet = await loadToilet(id);
  if (!toilet) return { title: t('toilet.notFoundTitle'), robots: { index: false } };
  return {
    title: toiletName(toilet, locale),
    description: [
      t(`toilet.bidetType.${toilet.bidetType}`),
      t(`toilet.access.${toilet.access}`),
      toilet.address,
    ]
      .filter(Boolean)
      .join(', '),
  };
}

export default function ToiletPage({ params }: Props) {
  // The id is only known at request time, so everything that depends on it streams in
  return (
    <PageShell>
      <Suspense fallback={<div className="bg-foam mt-14 h-80 animate-pulse rounded-2xl" />}>
        <ToiletContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function ToiletContent({ params }: Pick<Props, 'params'>) {
  const { locale: param, id } = await params;
  const locale = hasLocale(param) ? param : defaultLocale;
  const t = await getTranslate(locale);
  const toilet = await loadToilet(id);
  const back = <BackLink href={`/${locale}`} label={t('common.backToMap')} />;

  if (!toilet) {
    return (
      <main>
        {back}
        <h1 className="mt-10 text-2xl font-bold">{t('toilet.notFoundTitle')}</h1>
        <p className="text-ink-soft mt-2">{t('toilet.notFoundBody')}</p>
        <Link href={`/${locale}`} className={buttonClass('primary', 'mt-6')}>
          {t('common.backToMap')}
        </Link>
      </main>
    );
  }

  return (
    <main>
      {back}
      <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-tight">
        {toiletName(toilet, locale)}
      </h1>
      {secondaryName(toilet, locale) && (
        <p className="text-ink-soft mt-1">{secondaryName(toilet, locale)}</p>
      )}

      <div className="mt-5">
        <MiniMap lat={toilet.lat} lng={toilet.lng} unverified={toilet.status === 'pending'} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={kakaoDirectionsUrl(toilet)}
          target="_blank"
          rel="noreferrer"
          className={buttonClass('primary', 'flex-1')}
        >
          <DirectionsIcon width={18} height={18} />
          {t('toilet.directions')}
        </a>
        <ShareButton path={`/${locale}/toilets/${toilet.id}`} title={toiletName(toilet, locale)} />
      </div>

      <div className="bg-surface mt-6 rounded-2xl p-5">
        <ToiletInfo toilet={toilet} t={t} locale={locale} full />
      </div>

      <div className="bg-surface mt-3 rounded-2xl p-5">
        <ConfirmBidet toiletId={toilet.id} />
      </div>

      <div className="mt-3">
        <ReportProblem toiletId={toilet.id} />
      </div>
    </main>
  );
}
