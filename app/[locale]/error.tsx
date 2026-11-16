'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { Button, PageShell } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <main className="pt-16">
        <h1 className="text-2xl font-bold">{t('errors.generic')}</h1>
        <Button className="mt-6" onClick={() => retry()}>
          {t('common.retry')}
        </Button>
      </main>
    </PageShell>
  );
}
