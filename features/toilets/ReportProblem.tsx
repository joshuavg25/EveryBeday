'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CloseIcon, FlagIcon } from '@/components/icons';
import { Button, Notice } from '@/components/ui';
import { api, errorMessage } from '@/features/api/client';
import { loginHref } from '@/features/auth/login';
import { useI18n } from '@/i18n/I18nProvider';
import { REPORT_REASONS } from './schemas';
import type { ReportReason } from './types';

// "Report a problem" button that opens a small dialog with reasons and an optional note
export function ReportProblem({ toiletId }: { toiletId: string }) {
  const { t, locale } = useI18n();
  const { status } = useSession();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason>('no_bidet');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function open() {
    if (status === 'unauthenticated') {
      router.push(loginHref(locale, window.location.pathname));
      return;
    }
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api(`/api/toilets/${toiletId}/report`, { method: 'POST', body: { reason, note } });
      setSent(true);
      setNote('');
      dialogRef.current?.close();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {sent ? (
        <Notice tone="success">{t('report.sent')}</Notice>
      ) : (
        <button
          type="button"
          onClick={open}
          className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          <FlagIcon width={18} height={18} />
          {t('report.open')}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="text-ink backdrop:bg-ink/40 bg-surface m-auto w-[min(92vw,26rem)] rounded-2xl p-0"
      >
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('report.title')}</h2>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => dialogRef.current?.close()}
              className="text-ink-soft hover:bg-mist -mt-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-full"
            >
              <CloseIcon />
            </button>
          </div>

          <fieldset className="space-y-1">
            <legend className="sr-only">{t('report.title')}</legend>
            {REPORT_REASONS.map((value) => (
              <label
                key={value}
                className="hover:bg-mist flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-[15px]"
              >
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="accent-water h-4 w-4"
                />
                {t(`report.reason.${value}`)}
              </label>
            ))}
          </fieldset>

          <label className="block text-sm font-medium">
            {t('report.note')}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder={t('report.notePlaceholder')}
              className="border-line mt-1.5 block w-full rounded-xl border px-3 py-2 text-[15px] font-normal"
            />
          </label>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => dialogRef.current?.close()}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={sending}>
              {t('report.send')}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
