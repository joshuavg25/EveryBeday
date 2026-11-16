import { NextResponse, type NextRequest } from 'next/server';
import { updateToiletSchema, uuidSchema } from '@/features/toilets/schemas';
import { ApiError, handle, readJson, requireUser } from '@/server/http';
import { getToilet, updateToilet } from '@/server/services/toilets';

type Context = RouteContext<'/api/toilets/[id]'>;

// GET /api/toilets/:id
export const GET = handle(async (_request: NextRequest, ctx: Context) => {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, 'not_found');

  const toilet = await getToilet(id.data);
  if (!toilet) throw new ApiError(404, 'not_found');
  return NextResponse.json({ toilet });
});

// PATCH /api/toilets/:id — edit details (the submitter or a moderator)
export const PATCH = handle(async (request: NextRequest, ctx: Context) => {
  const user = await requireUser();
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, 'not_found');

  const patch = updateToiletSchema.parse(await readJson(request));
  const toilet = await updateToilet(user, id.data, patch);
  return NextResponse.json({ toilet });
});
