import { NextResponse, type NextRequest } from 'next/server';
import { filterSchema, nearestSchema } from '@/features/toilets/schemas';
import { handle } from '@/server/http';
import { listNearest } from '@/server/services/toilets';

// GET /api/toilets/nearest?lat=37.56&lng=126.97&limit=5 (+ the same filters as /api/toilets)
export const GET = handle(async (request: NextRequest) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const { lat, lng, limit } = nearestSchema.parse(params);
  const filters = filterSchema.parse(params);

  const toilets = await listNearest(lat, lng, limit, filters);
  return NextResponse.json({ toilets });
});
