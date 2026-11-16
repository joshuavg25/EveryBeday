import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, hasLocale, LOCALE_COOKIE, locales, type Locale } from '@/i18n/config';

// Pick a language: the user's saved choice first, then the browser's preferred language
function detectLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;

  const accepted = request.headers.get('accept-language') ?? '';
  for (const part of accepted.split(',')) {
    const language = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (hasLocale(language)) return language;
  }
  return defaultLocale;
}

// Every page lives under /en or /ko. Requests without a language prefix are redirected.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${detectLocale(request)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next.js internals and files such as /markers/pin.svg
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
