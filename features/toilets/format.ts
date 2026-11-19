import type { Locale } from '@/i18n/config';

const DAY_MS = 24 * 60 * 60 * 1000;

// After this long without a confirmation, a listing is flagged as possibly outdated
export const STALE_AFTER_DAYS = 180;

export function formatDistance(meters: number, locale: Locale) {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return meters < 1000 ? `${Math.round(meters)} m` : `${number.format(meters / 1000)} km`;
}

const daysSince = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS));

// "today", "3 days ago", "2 months ago" in the user's language
export function formatAgo(iso: string, locale: Locale, now = Date.now()) {
  const days = daysSince(iso, now);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (days < 30) return relative.format(-days, 'day');
  if (days < 365) return relative.format(-Math.floor(days / 30), 'month');
  return relative.format(-Math.floor(days / 365), 'year');
}

export const isStale = (iso: string | null, now = Date.now()) =>
  iso !== null && daysSince(iso, now) > STALE_AFTER_DAYS;

// Opens Kakao Map with this place set as the destination
export const kakaoDirectionsUrl = (toilet: { name: string; lat: number; lng: number }) =>
  `https://map.kakao.com/link/to/${encodeURIComponent(toilet.name)},${toilet.lat},${toilet.lng}`;
