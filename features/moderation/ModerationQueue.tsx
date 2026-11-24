'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Badge, Button, buttonClass, Notice } from '@/components/ui';
import { api, ApiClientError, errorMessage } from '@/features/api/client';
import { loginHref } from '@/features/auth/login';
import { formatAgo } from '@/features/toilets/format';
import type { ModerationQueue as Queue, QueueToilet } from '@/features/toilets/types';
import { useI18n } from '@/i18n/I18nProvider';

type State =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'notAllowed' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; queue: Queue };

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        <Badge tone={count > 0 ? 'caution' : 'neutral'}>{count}</Badge>
      </h2>
      {count === 0 ? (
        <p className="text-ink-soft mt-2 text-[15px]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">{children}</ul>
      )}
    </section>
  );
}

// The moderator's inbox: new submissions, toilets hidden by votes, and reports from users
export function ModerationQueue() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ask the server for the queue and describe the outcome as a State
  const fetchQueue = useCallback(async (): Promise<State> => {
    try {
      return { kind: 'ready', queue: await api<Queue>('/api/admin/queue') };
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) return { kind: 'signedOut' };
      if (err instanceof ApiClientError && err.status === 403) return { kind: 'notAllowed' };
      return { kind: 'error', message: errorMessage(t, err) };
    }
  }, [t]);

  const load = useCallback(async () => setState(await fetchQueue()), [fetchQueue]);

  // Load once when the page opens
  useEffect(() => {
    let cancelled = false;
    fetchQueue().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchQueue]);

  // Run one moderation action, then reload the queue so the lists stay truthful
  async function act(id: string, path: string, body?: unknown) {
    setBusy(id);
    setActionError(null);
    try {
      await api(path, { method: 'POST', body });
      await load();
    } catch (err) {
      setActionError(errorMessage(t, err));
    } finally {
      setBusy(null);
    }
  }
  const review = (id: string, action: 'approve' | 'hide') =>
    act(id, `/api/admin/toilets/${id}/review`, { action });

  if (state.kind === 'loading') return <div className="bg-foam h-64 animate-pulse rounded-2xl" />;
  if (state.kind === 'signedOut') {
    return (
      <Link href={loginHref(locale, `/${locale}/admin`)} className={buttonClass('primary')}>
        {t('common.signIn')}
      </Link>
    );
  }
  if (state.kind === 'notAllowed') return <Notice>{t('admin.notAllowed')}</Notice>;
  if (state.kind === 'error') {
    return (
      <div className="space-y-3">
        <Notice tone="error">{state.message}</Notice>
        <Button variant="secondary" onClick={load}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const { pending, hidden, reports } = state.queue;

  const toiletCard = (toilet: QueueToilet, actions: ReactNode) => (
    <li key={toilet.id} className="bg-surface rounded-2xl p-4">
      <Link
        href={`/${locale}/toilets/${toilet.id}`}
        className="font-semibold underline-offset-4 hover:underline"
      >
        {toilet.name}
      </Link>
      <p className="text-ink-soft mt-1 text-sm">
        {[
          t(`toilet.bidetType.${toilet.bidetType}`),
          t(`toilet.access.${toilet.access}`),
          toilet.floor && t('toilet.floor', { floor: toilet.floor }),
          toilet.address,
        ]
          .filter(Boolean)
          .join(', ')}
      </p>
      {toilet.note && <p className="mt-1 text-sm">{toilet.note}</p>}
      <p className="text-ink-soft mt-1 text-sm">
        {t('admin.submittedBy', { name: toilet.submittedBy ?? t('admin.unknownUser') })},{' '}
        {formatAgo(toilet.createdAt, locale)}
      </p>
      <p className="text-ink-soft text-sm">
        {t('toilet.votes', { yes: toilet.recentYes, no: toilet.recentNo })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </li>
  );

  return (
    <div className="space-y-9">
      {actionError && <Notice tone="error">{actionError}</Notice>}

      <Section title={t('admin.reports')} count={reports.length} empty={t('admin.emptyReports')}>
        {reports.map((report) => (
          <li key={report.id} className="bg-surface rounded-2xl p-4">
            <p className="font-semibold">{t(`report.reason.${report.reason}`)}</p>
            <Link
              href={`/${locale}/toilets/${report.toilet.id}`}
              className="text-[15px] underline underline-offset-4"
            >
              {report.toilet.name}
            </Link>
            {report.note && <p className="mt-1 text-sm">{report.note}</p>}
            <p className="text-ink-soft mt-1 text-sm">
              {t('admin.reportedBy', { name: report.reportedBy ?? t('admin.unknownUser') })},{' '}
              {formatAgo(report.createdAt, locale)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={busy !== null}
                onClick={() => act(report.id, `/api/admin/reports/${report.id}/resolve`)}
              >
                {t('admin.dismiss')}
              </Button>
              {report.toilet.status !== 'hidden' && (
                <Button
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() => review(report.toilet.id, 'hide')}
                >
                  {t('admin.hideToilet')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </Section>

      <Section title={t('admin.pending')} count={pending.length} empty={t('admin.emptyPending')}>
        {pending.map((toilet) =>
          toiletCard(
            toilet,
            <>
              <Button disabled={busy !== null} onClick={() => review(toilet.id, 'approve')}>
                {t('admin.approve')}
              </Button>
              <Button
                variant="danger"
                disabled={busy !== null}
                onClick={() => review(toilet.id, 'hide')}
              >
                {t('admin.hide')}
              </Button>
            </>,
          ),
        )}
      </Section>

      <Section title={t('admin.hidden')} count={hidden.length} empty={t('admin.emptyHidden')}>
        {hidden.map((toilet) =>
          toiletCard(
            toilet,
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => review(toilet.id, 'approve')}
            >
              {t('admin.restore')}
            </Button>,
          ),
        )}
      </Section>
    </div>
  );
}
