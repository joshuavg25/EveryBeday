import { NextResponse } from 'next/server';
import { handle, requireModerator } from '@/server/http';
import { getModerationQueue } from '@/server/services/toilets';

// GET /api/admin/queue — unverified toilets, hidden toilets and open reports (moderators)
export const GET = handle(async () => {
  await requireModerator();
  return NextResponse.json(await getModerationQueue());
});
