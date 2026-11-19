'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, Notice } from '@/components/ui';
import { api, errorMessage } from '@/features/api/client';
import { loginHref } from '@/features/auth/login';
import { useI18n } from '@/i18n/I18nProvider';
import type { ToiletStatus } from './types';

type ConfirmResult = {
  status: ToiletStatus;
  activated: boolean;
  recentYes: number;
  recentNo: number;
};

// "Is the bidet still here?" with a yes and a no button.
// Each signed-in user can answer once a day per toilet.
export function ConfirmBidet({
  toiletId,
  onResult,
}: {
  toiletId: string;
  onResult?: (result: ConfirmResult) => void;
}) {
  const { t, locale } = useI18n();
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [answered, setAnswered] = useState(false);

  async function answer(hasBidet: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api<ConfirmResult>(`/api/toilets/${toiletId}/confirm`, {
        method: 'POST',
        body: { hasBidet },
      });
      setAnswered(true);
      setMessage({
        tone: 'success',
        text:
          result.status === 'hidden'
            ? t('confirm.nowHidden')
            : result.activated
              ? t('confirm.nowVerified')
              : hasBidet
                ? t('confirm.savedYes')
                : t('confirm.savedNo'),
      });
      onResult?.(result);
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(t, err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[15px] font-semibold">{t('confirm.question')}</p>
      {sessionStatus === 'unauthenticated' ? (
        <Button
          variant="secondary"
          onClick={() => router.push(loginHref(locale, window.location.pathname))}
        >
          {t('confirm.signInFirst')}
        </Button>
      ) : (
        !answered && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={saving || sessionStatus === 'loading'}
              onClick={() => answer(true)}
            >
              {t('confirm.yes')}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={saving || sessionStatus === 'loading'}
              onClick={() => answer(false)}
            >
              {t('confirm.no')}
            </Button>
          </div>
        )
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}
