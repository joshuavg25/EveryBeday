import { NextResponse, type NextRequest } from 'next/server';
import { confirmSchema, uuidSchema } from '@/features/toilets/schemas';
import { ApiError, handle, readJson, requireUser } from '@/server/http';
import { confirmToilet } from '@/server/services/toilets';

// POST /api/toilets/:id/confirm { hasBidet } — "the bidet is still here" / "it's gone"
export const POST = handle(
  async (request: NextRequest, ctx: RouteContext<'/api/toilets/[id]/confirm'>) => {
    const user = await requireUser();
    const id = uuidSchema.safeParse((await ctx.params).id);
    if (!id.success) throw new ApiError(404, 'not_found');

    const { hasBidet } = confirmSchema.parse(await readJson(request));
    const result = await confirmToilet(user, id.data, hasBidet);
    return NextResponse.json(result);
  },
);
