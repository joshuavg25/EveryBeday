import { NextResponse, type NextRequest } from 'next/server';
import { bboxSchema, createToiletSchema, filterSchema } from '@/features/toilets/schemas';
import { ApiError, handle, readJson, requireUser } from '@/server/http';
import { createToilet, listInBbox } from '@/server/services/toilets';

// GET /api/toilets?bbox=minLng,minLat,maxLng,maxLat&open24h=1&free=1&wheelchair=1&verified=1&gender=female
export const GET = handle(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const bbox = bboxSchema.safeParse(params.get('bbox'));
  if (!bbox.success) throw new ApiError(400, 'invalid_bbox');
  const filters = filterSchema.parse(Object.fromEntries(params));

  const toilets = await listInBbox(bbox.data, filters);
  return NextResponse.json({ toilets });
});

// POST /api/toilets — add a toilet (signed-in users)
export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser();
  const input = createToiletSchema.parse(await readJson(request));
  const toilet = await createToilet(user, input);
  return NextResponse.json({ toilet }, { status: 201 });
});
