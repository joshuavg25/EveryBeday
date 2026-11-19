import type { MessageKey, Translate } from '@/i18n/translate';

// Error codes the API can return (see server/http.ts and server/services/toilets.ts)
const KNOWN_CODES = [
  'unauthorized',
  'banned',
  'forbidden',
  'not_found',
  'invalid_input',
  'daily_limit',
  'already_confirmed',
  'own_submission',
  'already_reported',
  'server_error',
] as const;
type KnownCode = (typeof KNOWN_CODES)[number];

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

// fetch wrapper for our own API: sends/reads JSON and throws ApiClientError on failure
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiClientError(0, 'network');
  }

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    details?: unknown;
  } | null;
  if (!response.ok) {
    throw new ApiClientError(response.status, data?.error ?? 'server_error', data?.details);
  }
  return data as T;
}

export const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

// Turn any thrown value into a message in the user's language
export function errorMessage(t: Translate, err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'network') return t('errors.network');
    if ((KNOWN_CODES as readonly string[]).includes(err.code)) {
      return t(`errors.${err.code as KnownCode}` satisfies MessageKey);
    }
  }
  return t('errors.generic');
}
