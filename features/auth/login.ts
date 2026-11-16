import type { Locale } from '@/i18n/config';

// Link to the sign-in page that brings the user back to `next` afterwards
export const loginHref = (locale: Locale, next: string) =>
  `/${locale}/login?next=${encodeURIComponent(next)}`;

// Only allow redirects to our own pages: "/en/add" is fine, "//evil.com" or "https://…" is not
export function safeNextPath(next: string | null, fallback: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}
