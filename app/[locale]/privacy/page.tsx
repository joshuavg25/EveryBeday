import type { Metadata } from 'next';
import { BackLink } from '@/components/BackLink';
import { PageShell } from '@/components/ui';
import { defaultLocale, hasLocale } from '@/i18n/config';
import { getMessages, getTranslate } from '@/i18n/dictionaries';

// Change these two when the policy or the contact address changes
const LAST_UPDATED = '2026-11-16';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'privacy@example.com';

type Props = PageProps<'/[locale]/privacy'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslate(hasLocale(locale) ? locale : defaultLocale);
  return { title: t('privacy.title') };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale: param } = await params;
  const locale = hasLocale(param) ? param : defaultLocale;
  const [t, messages] = await Promise.all([getTranslate(locale), getMessages(locale)]);
  const updated = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(LAST_UPDATED),
  );

  return (
    <PageShell>
      <main>
        <BackLink href={`/${locale}`} label={t('common.backToMap')} />
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-tight">
          {t('privacy.title')}
        </h1>
        <p className="text-ink-soft mt-1 text-sm">{t('privacy.updated', { date: updated })}</p>

        <div className="mt-8 space-y-7">
          {messages.privacy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              <p className="mt-1.5 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="border-line mt-10 border-t pt-5 text-[15px]">
          {t('privacy.contact', { email: CONTACT_EMAIL })}
        </p>
      </main>
    </PageShell>
  );
}
