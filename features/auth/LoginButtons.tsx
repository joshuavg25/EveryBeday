'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';
import { safeNextPath } from './login';

const base =
  'flex min-h-12 w-full items-center justify-center rounded-full text-base font-semibold disabled:opacity-60';

// Sign-in buttons. After signing in, the user returns to the page they came from (?next=…).
export function LoginButtons() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const redirectTo = safeNextPath(searchParams.get('next'), `/${locale}`);

  const start = (provider: 'kakao' | 'google') => {
    setPending(true);
    signIn(provider, { redirectTo });
  };

  return (
    <div className="space-y-3">
      {/* Kakao's brand guideline: yellow #FEE500 button with near-black text */}
      <button
        type="button"
        disabled={pending}
        onClick={() => start('kakao')}
        className={`${base} bg-[#FEE500] text-[#191600] hover:bg-[#f5dc00]`}
      >
        {t('login.kakao')}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start('google')}
        className={`${base} border-line text-ink hover:bg-mist bg-surface border`}
      >
        {t('login.google')}
      </button>
    </div>
  );
}
