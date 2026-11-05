import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { toilets } from '@/server/db/schema';

// bbox = "minLng,minLat,maxLng,maxLat"
const bboxSchema = z
  .string()
  .transform((s) => s.split(',').map(Number))
  .pipe(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  );

export async function GET(request: NextRequest) {
  const parsed = bboxSchema.safeParse(request.nextUrl.searchParams.get('bbox'));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid bbox. Expected minLng,minLat,maxLng,maxLat' },
      { status: 400 },
    );
  }
  const [minLng, minLat, maxLng, maxLat] = parsed.data;

  const rows = await db
    .select({
      id: toilets.id,
      name: toilets.name,
      lng: sql<number>`ST_X(${toilets.location})`,
      lat: sql<number>`ST_Y(${toilets.location})`,
      floor: toilets.floor,
      bidetType: toilets.bidetType,
      access: toilets.access,
      is24h: toilets.is24h,
      wheelchair: toilets.wheelchair,
    })
    .from(toilets)
    .where(
      and(
        eq(toilets.status, 'active'),
        // Uses the GiST index: only toilets inside the visible map area
        sql`${toilets.location} && ST_MakeEnvelope(${minLng}::float8, ${minLat}::float8, ${maxLng}::float8, ${maxLat}::float8, 4326)`,
      ),
    )
    .limit(500);

  return NextResponse.json({ toilets: rows });
}
