'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { UserIcon } from '@/components/icons';
import { useTheme, type ThemeMode } from '@/components/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { LOCALE_COOKIE, localeNames, locales, type Locale } from '@/i18n/config';
import { loginHref } from './login';

// Remember the chosen language for a year, so the next visit opens in it
function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

const itemClass =
  'flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] hover:bg-mist';

// Round button in the top corner. Opens a menu with the language choice, a few links,
// and sign in / sign out.
export function AccountMenu() {
  const { t, locale } = useI18n();
  const { mode, setMode } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on a click outside the menu or on Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function switchLocale(next: Locale) {
    // Save the choice, then show the same page in the other language
    saveLocale(next);
    const rest = window.location.pathname.split('/').slice(2).join('/');
    router.replace(`/${next}${rest ? `/${rest}` : ''}${window.location.search}`);
    setOpen(false);
  }

  const user = session?.user;
  const canModerate = user?.role === 'moderator' || user?.role === 'admin';
  const themeOptions: { mode: ThemeMode; label: string }[] = [
    { mode: 'light', label: t('nav.themeLight') },
    { mode: 'dark', label: t('nav.themeDark') },
    { mode: 'system', label: t('nav.themeSystem') },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t('nav.account')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="shadow-float text-ink bg-surface flex h-11 w-11 items-center justify-center overflow-hidden rounded-full"
      >
        {user?.image ? (
          // Profile pictures come from Kakao/Google hosts, so a plain img avoids image config
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserIcon />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="shadow-float bg-surface absolute top-13 right-0 z-30 w-60 rounded-2xl p-2"
        >
          {user && <p className="text-ink-soft truncate px-3 pt-1.5 pb-2 text-sm">{user.name}</p>}

          <Link href={`/${locale}/add`} role="menuitem" className={itemClass}>
            {t('nav.addToilet')}
          </Link>
          {canModerate && (
            <Link href={`/${locale}/admin`} role="menuitem" className={itemClass}>
              {t('nav.moderation')}
            </Link>
          )}
          <Link href={`/${locale}/privacy`} role="menuitem" className={itemClass}>
            {t('nav.privacy')}
          </Link>

          <div className="border-line my-1.5 border-t" />
          <p className="text-ink-soft px-3 pt-1 pb-1 text-xs font-medium">{t('nav.theme')}</p>
          {themeOptions.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="menuitemradio"
              aria-checked={option.mode === mode}
              onClick={() => setMode(option.mode)}
              className={`${itemClass} ${option.mode === mode ? 'font-semibold' : ''}`}
            >
              {option.label}
            </button>
          ))}

          <div className="border-line my-1.5 border-t" />
          <p className="text-ink-soft px-3 pt-1 pb-1 text-xs font-medium">{t('nav.language')}</p>
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              onClick={() => switchLocale(l)}
              className={`${itemClass} ${l === locale ? 'font-semibold' : ''}`}
            >
              {localeNames[l]}
            </button>
          ))}

          <div className="border-line my-1.5 border-t" />
          {status === 'authenticated' ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => signOut({ redirectTo: `/${locale}` })}
            >
              {t('common.signOut')}
            </button>
          ) : (
            <Link
              href={loginHref(locale, `/${locale}`)}
              role="menuitem"
              className={`${itemClass} text-water-deep font-semibold`}
            >
              {t('common.signIn')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
