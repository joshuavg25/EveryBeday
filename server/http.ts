import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth, type Role } from '@/server/auth';

// An error that should reach the client as a JSON response with this status and code.
// The client translates `code` into a message, so codes must stay stable.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

export type SessionUser = { id: string; role: Role };

// Signed-in, not banned user, or a 401/403
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, 'unauthorized');
  if (session.user.banned) throw new ApiError(403, 'banned');
  return { id: session.user.id, role: session.user.role };
}

export async function requireModerator(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'moderator' && user.role !== 'admin') throw new ApiError(403, 'forbidden');
  return user;
}

export function isModerator(user: SessionUser) {
  return user.role === 'moderator' || user.role === 'admin';
}

// Wraps a route handler so thrown ApiError/ZodError become clean JSON responses
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      // Let Next.js handle its own control-flow errors (redirects, prerender bail-outs)
      unstable_rethrow(err);
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.code, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'invalid_input', details: err.issues.map((i) => i.path.join('.')) },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'invalid_json');
  }
}
