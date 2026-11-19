import { NextResponse, type NextRequest } from 'next/server';
import { reviewSchema, uuidSchema } from '@/features/toilets/schemas';
import { ApiError, handle, readJson, requireModerator } from '@/server/http';
import { reviewToilet } from '@/server/services/toilets';

// POST /api/admin/toilets/:id/review { action: "approve" | "hide" }
export const POST = handle(
  async (request: NextRequest, ctx: RouteContext<'/api/admin/toilets/[id]/review'>) => {
    const moderator = await requireModerator();
    const id = uuidSchema.safeParse((await ctx.params).id);
    if (!id.success) throw new ApiError(404, 'not_found');

    const { action } = reviewSchema.parse(await readJson(request));
    const toilet = await reviewToilet(moderator, id.data, action);
    return NextResponse.json({ toilet });
  },
);
