import { NextResponse, type NextRequest } from 'next/server';
import { uuidSchema } from '@/features/toilets/schemas';
import { ApiError, handle, requireModerator } from '@/server/http';
import { resolveReport } from '@/server/services/toilets';

// POST /api/admin/reports/:id/resolve — close a report without changing the toilet
export const POST = handle(
  async (_request: NextRequest, ctx: RouteContext<'/api/admin/reports/[id]/resolve'>) => {
    const moderator = await requireModerator();
    const id = uuidSchema.safeParse((await ctx.params).id);
    if (!id.success) throw new ApiError(404, 'not_found');

    const report = await resolveReport(moderator, id.data);
    return NextResponse.json({ report });
  },
);
