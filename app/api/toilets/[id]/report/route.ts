import { NextResponse, type NextRequest } from 'next/server';
import { reportSchema, uuidSchema } from '@/features/toilets/schemas';
import { ApiError, handle, readJson, requireUser } from '@/server/http';
import { reportToilet } from '@/server/services/toilets';

// POST /api/toilets/:id/report { reason, note? }
export const POST = handle(
  async (request: NextRequest, ctx: RouteContext<'/api/toilets/[id]/report'>) => {
    const user = await requireUser();
    const id = uuidSchema.safeParse((await ctx.params).id);
    if (!id.success) throw new ApiError(404, 'not_found');

    const input = reportSchema.parse(await readJson(request));
    const report = await reportToilet(user, id.data, input);
    return NextResponse.json({ report }, { status: 201 });
  },
);
