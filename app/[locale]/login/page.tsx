import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BackLink } from '@/components/BackLink';
import { PageShell } from '@/components/ui';
import { LoginButtons } from '@/features/auth/LoginButtons';
import { defaultLocale, hasLocale } from '@/i18n/config';
import { getTranslate } from '@/i18n/dictionaries';

type Props = PageProps<'/[locale]/login'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslate(hasLocale(locale) ? locale : defaultLocale);
  return { title: t('common.signIn'), robots: { index: false } };
}

export default async function LoginPage({ params }: Props) {
  const { locale: param } = await params;
  const locale = hasLocale(param) ? param : defaultLocale;
  const t = await getTranslate(locale);

  return (
    <PageShell>
      <main>
        <BackLink href={`/${locale}`} label={t('common.backToMap')} />
        <h1 className="mt-8 text-[28px] leading-tight font-bold tracking-tight">
          {t('login.title')}
        </h1>
        <p className="text-ink-soft mt-2">{t('login.body')}</p>

        <div className="mt-8">
          {/* The buttons read ?next= from the address, which is only known at request time */}
          <Suspense fallback={<div className="bg-foam h-27 animate-pulse rounded-3xl" />}>
            <LoginButtons />
          </Suspense>
        </div>

        <p className="text-ink-soft mt-6 text-sm">
          {t('login.privacy')}{' '}
          <Link href={`/${locale}/privacy`} className="underline underline-offset-4">
            {t('nav.privacy')}
          </Link>
        </p>
      </main>
    </PageShell>
  );
}
