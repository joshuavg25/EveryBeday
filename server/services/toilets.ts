import 'server-only';
import { and, asc, desc, eq, gt, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { confirmations, reports, toilets, users } from '@/server/db/schema';
import { ApiError, isModerator, type SessionUser } from '@/server/http';
import type { ReportReason, ToiletDetail, ToiletPin, ToiletStatus } from '@/features/toilets/types';
import type { ToiletFilters } from '@/features/toilets/schemas';
import type { z } from 'zod';
import type {
  createToiletSchema,
  reportSchema,
  updateToiletSchema,
} from '@/features/toilets/schemas';

// Tunable rules. Change the numbers here, not in the functions below.
export const RULES = {
  submissionsPerDay: 5,
  confirmationsPerDay: 30,
  reportsPerDay: 10,
  // A new toilet this close to an existing one triggers the "same toilet?" warning
  duplicateRadiusM: 30,
  // A pending toilet becomes active after this many other users say the bidet is there
  confirmationsToActivate: 2,
  // Votes older than this are ignored when deciding to activate or hide
  voteWindowDays: 30,
  // A toilet is hidden when at least this many users say "no bidet" and they outnumber "yes"
  negativeVotesToHide: 3,
  maxPinsPerRequest: 500,
} as const;

const lngOf = sql<number>`ST_X(${toilets.location})`;
const latOf = sql<number>`ST_Y(${toilets.location})`;

// The location column has no SRID, so build SRID-less points and cast both sides for meters
const pointOf = (lng: number, lat: number) => sql`ST_MakePoint(${lng}::float8, ${lat}::float8)`;
const metersTo = (lng: number, lat: number) =>
  sql<number>`ST_Distance(ST_SetSRID(${toilets.location}, 4326)::geography, ST_SetSRID(${pointOf(lng, lat)}, 4326)::geography)`;

const pinColumns = {
  id: toilets.id,
  name: toilets.name,
  lng: lngOf,
  lat: latOf,
  floor: toilets.floor,
  buildingName: toilets.buildingName,
  bidetType: toilets.bidetType,
  access: toilets.access,
  gender: toilets.gender,
  is24h: toilets.is24h,
  openingHours: toilets.openingHours,
  wheelchair: toilets.wheelchair,
  status: toilets.status,
  lastConfirmedAt: toilets.lastConfirmedAt,
};

const detailColumns = {
  ...pinColumns,
  address: toilets.address,
  note: toilets.note,
  confirmCount: toilets.confirmCount,
  createdAt: toilets.createdAt,
};

type PinRow = Omit<ToiletPin, 'lastConfirmedAt' | 'distanceM'> & { lastConfirmedAt: Date | null };

const toPin = (row: PinRow): ToiletPin => ({
  ...row,
  lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
});

function filterConditions(filters: ToiletFilters): SQL[] {
  const conditions: SQL[] = [
    // Hidden toilets never leave the server. Pending ones are shown as "unverified"
    // so other users can confirm them, unless the user asked for verified only.
    filters.verified
      ? eq(toilets.status, 'active')
      : inArray(toilets.status, ['active', 'pending']),
  ];
  if (filters.open24h) conditions.push(eq(toilets.is24h, true));
  if (filters.free) conditions.push(eq(toilets.access, 'public'));
  if (filters.wheelchair) conditions.push(eq(toilets.wheelchair, true));
  if (filters.gender) {
    conditions.push(inArray(toilets.gender, ['all', 'unisex', filters.gender]));
  }
  return conditions;
}

export async function listInBbox(
  [minLng, minLat, maxLng, maxLat]: [number, number, number, number],
  filters: ToiletFilters,
): Promise<ToiletPin[]> {
  const rows = await db
    .select(pinColumns)
    .from(toilets)
    .where(
      and(
        // Uses the GiST index: only toilets inside the visible map area
        sql`${toilets.location} && ST_MakeEnvelope(${minLng}::float8, ${minLat}::float8, ${maxLng}::float8, ${maxLat}::float8)`,
        ...filterConditions(filters),
      ),
    )
    .limit(RULES.maxPinsPerRequest);
  return rows.map(toPin);
}

export async function listNearest(
  lat: number,
  lng: number,
  limit: number,
  filters: ToiletFilters,
): Promise<ToiletPin[]> {
  // The index orders by distance in degrees, which is slightly off from meters at Seoul's
  // latitude. Take a few extra candidates, then sort them by real distance.
  const rows = await db
    .select({ ...pinColumns, distanceM: metersTo(lng, lat) })
    .from(toilets)
    .where(and(...filterConditions(filters)))
    .orderBy(sql`${toilets.location} <-> ${pointOf(lng, lat)}`)
    .limit(limit * 4);

  return rows
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit)
    .map(({ distanceM, ...row }) => ({ ...toPin(row), distanceM: Math.round(distanceM) }));
}

// Distinct users who voted yes / no within the vote window
async function recentVotes(toiletId: string, excludeUserId?: string | null) {
  const [row] = await db
    .select({
      yes: sql<number>`count(distinct ${confirmations.userId}) filter (where ${confirmations.hasBidet})::int`,
      no: sql<number>`count(distinct ${confirmations.userId}) filter (where not ${confirmations.hasBidet})::int`,
    })
    .from(confirmations)
    .where(
      and(
        eq(confirmations.toiletId, toiletId),
        gt(
          confirmations.createdAt,
          sql`now() - make_interval(days => ${RULES.voteWindowDays}::int)`,
        ),
        excludeUserId ? ne(confirmations.userId, excludeUserId) : undefined,
      ),
    );
  return { yes: row?.yes ?? 0, no: row?.no ?? 0 };
}

export async function getToilet(
  id: string,
  options: { includeHidden?: boolean } = {},
): Promise<ToiletDetail | null> {
  const [row] = await db.select(detailColumns).from(toilets).where(eq(toilets.id, id)).limit(1);
  if (!row) return null;
  if (row.status === 'hidden' && !options.includeHidden) return null;
  const votes = await recentVotes(id);
  return {
    ...toPin(row),
    address: row.address,
    note: row.note,
    confirmCount: row.confirmCount,
    createdAt: row.createdAt.toISOString(),
    recentYes: votes.yes,
    recentNo: votes.no,
  };
}

export async function findNearby(lat: number, lng: number, radiusM: number) {
  // ~0.0005 degrees is roughly 45-55 m in Seoul: a cheap index prefilter before the exact check
  const pad = (radiusM / 30) * 0.0005;
  const rows = await db
    .select({ id: toilets.id, name: toilets.name, distanceM: metersTo(lng, lat) })
    .from(toilets)
    .where(
      and(
        sql`${toilets.location} && ST_Expand(${pointOf(lng, lat)}, ${pad}::float8)`,
        inArray(toilets.status, ['active', 'pending']),
      ),
    );
  return rows
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .map((r) => ({ ...r, distanceM: Math.round(r.distanceM) }));
}

const oneDayAgo = sql`now() - interval '1 day'`;

export async function createToilet(user: SessionUser, input: z.output<typeof createToiletSchema>) {
  const trusted = isModerator(user);

  if (!trusted) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(toilets)
      .where(and(eq(toilets.createdBy, user.id), gt(toilets.createdAt, oneDayAgo)));
    if (count >= RULES.submissionsPerDay) throw new ApiError(429, 'daily_limit');
  }

  if (!input.confirmNotDuplicate) {
    const nearby = await findNearby(input.lat, input.lng, RULES.duplicateRadiusM);
    if (nearby.length > 0) throw new ApiError(409, 'possible_duplicate', nearby);
  }

  const [row] = await db
    .insert(toilets)
    .values({
      name: input.name,
      location: { x: input.lng, y: input.lat },
      address: input.address,
      buildingName: input.buildingName,
      floor: input.floor,
      access: input.access,
      gender: input.gender,
      bidetType: input.bidetType,
      is24h: input.is24h,
      openingHours: input.is24h ? null : input.openingHours,
      wheelchair: input.wheelchair,
      note: input.note,
      // Moderators' submissions skip the queue
      status: trusted ? 'active' : 'pending',
      // The submitter just saw the bidet, so that counts as the first sighting
      lastConfirmedAt: new Date(),
      createdBy: user.id,
    })
    .returning({ id: toilets.id, status: toilets.status });
  return row;
}

export async function updateToilet(
  user: SessionUser,
  id: string,
  patch: z.output<typeof updateToiletSchema>,
) {
  const [existing] = await db
    .select({ createdBy: toilets.createdBy })
    .from(toilets)
    .where(eq(toilets.id, id))
    .limit(1);
  if (!existing) throw new ApiError(404, 'not_found');
  if (existing.createdBy !== user.id && !isModerator(user)) throw new ApiError(403, 'forbidden');

  const values = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(values).length === 0) throw new ApiError(400, 'invalid_input');

  await db
    .update(toilets)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(toilets.id, id));
  return { id };
}

export async function confirmToilet(user: SessionUser, id: string, hasBidet: boolean) {
  return db.transaction(async (tx) => {
    // Lock the row so two votes arriving together can't both miss the status change
    const [toilet] = await tx
      .select({ status: toilets.status, createdBy: toilets.createdBy })
      .from(toilets)
      .where(eq(toilets.id, id))
      .for('update')
      .limit(1);
    if (!toilet || toilet.status === 'hidden') throw new ApiError(404, 'not_found');

    // The submitter can't verify their own unverified submission
    if (toilet.status === 'pending' && toilet.createdBy === user.id) {
      throw new ApiError(403, 'own_submission');
    }

    const [{ today, sameToilet }] = await tx
      .select({
        today: sql<number>`count(*)::int`,
        sameToilet: sql<number>`count(*) filter (where ${confirmations.toiletId} = ${id})::int`,
      })
      .from(confirmations)
      .where(and(eq(confirmations.userId, user.id), gt(confirmations.createdAt, oneDayAgo)));
    if (sameToilet > 0) throw new ApiError(409, 'already_confirmed');
    if (today >= RULES.confirmationsPerDay) throw new ApiError(429, 'daily_limit');

    await tx.insert(confirmations).values({ toiletId: id, userId: user.id, hasBidet });

    const [votes] = await tx
      .select({
        yes: sql<number>`count(distinct ${confirmations.userId}) filter (where ${confirmations.hasBidet})::int`,
        no: sql<number>`count(distinct ${confirmations.userId}) filter (where not ${confirmations.hasBidet})::int`,
        yesFromOthers: sql<number>`count(distinct ${confirmations.userId}) filter (where ${confirmations.hasBidet} and ${confirmations.userId} is distinct from ${toilet.createdBy})::int`,
      })
      .from(confirmations)
      .where(
        and(
          eq(confirmations.toiletId, id),
          gt(
            confirmations.createdAt,
            sql`now() - make_interval(days => ${RULES.voteWindowDays}::int)`,
          ),
        ),
      );

    let status: ToiletStatus = toilet.status;
    if (votes.no >= RULES.negativeVotesToHide && votes.no > votes.yes) {
      status = 'hidden';
    } else if (status === 'pending' && votes.yesFromOthers >= RULES.confirmationsToActivate) {
      status = 'active';
    }

    await tx
      .update(toilets)
      .set({
        status,
        ...(hasBidet
          ? { confirmCount: sql`${toilets.confirmCount} + 1`, lastConfirmedAt: new Date() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(toilets.id, id));

    return {
      status,
      // True when this vote is the one that verified a pending toilet
      activated: toilet.status === 'pending' && status === 'active',
      recentYes: votes.yes,
      recentNo: votes.no,
    };
  });
}

export async function reportToilet(
  user: SessionUser,
  id: string,
  input: z.output<typeof reportSchema>,
) {
  const [toilet] = await db
    .select({ id: toilets.id })
    .from(toilets)
    .where(eq(toilets.id, id))
    .limit(1);
  if (!toilet) throw new ApiError(404, 'not_found');

  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(eq(reports.userId, user.id), gt(reports.createdAt, oneDayAgo)));
  if (today >= RULES.reportsPerDay) throw new ApiError(429, 'daily_limit');

  const [open] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.toiletId, id), eq(reports.userId, user.id), eq(reports.status, 'open')))
    .limit(1);
  if (open) throw new ApiError(409, 'already_reported');

  const [row] = await db
    .insert(reports)
    .values({ toiletId: id, userId: user.id, reason: input.reason, note: input.note })
    .returning({ id: reports.id });
  return row;
}

// ---- Moderation ----

async function listForQueue(status: 'pending' | 'hidden', limit: number) {
  const rows = await db
    .select({ ...detailColumns, submittedBy: users.name })
    .from(toilets)
    .leftJoin(users, eq(users.id, toilets.createdBy))
    .where(eq(toilets.status, status))
    .orderBy(status === 'pending' ? asc(toilets.createdAt) : desc(toilets.updatedAt))
    .limit(limit);

  return Promise.all(
    rows.map(async ({ submittedBy, ...row }) => {
      const votes = await recentVotes(row.id);
      return {
        ...toPin(row),
        address: row.address,
        note: row.note,
        confirmCount: row.confirmCount,
        createdAt: row.createdAt.toISOString(),
        recentYes: votes.yes,
        recentNo: votes.no,
        submittedBy,
      };
    }),
  );
}

export async function getModerationQueue() {
  const [pending, hidden, openReports] = await Promise.all([
    listForQueue('pending', 100),
    listForQueue('hidden', 50),
    db
      .select({
        id: reports.id,
        reason: reports.reason,
        note: reports.note,
        createdAt: reports.createdAt,
        reportedBy: users.name,
        toiletId: toilets.id,
        toiletName: toilets.name,
        toiletStatus: toilets.status,
        lng: lngOf,
        lat: latOf,
      })
      .from(reports)
      .innerJoin(toilets, eq(toilets.id, reports.toiletId))
      .leftJoin(users, eq(users.id, reports.userId))
      .where(eq(reports.status, 'open'))
      .orderBy(asc(reports.createdAt))
      .limit(100),
  ]);

  return {
    pending,
    hidden,
    reports: openReports.map((r) => ({
      id: r.id,
      reason: r.reason as ReportReason,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reportedBy: r.reportedBy,
      toilet: {
        id: r.toiletId,
        name: r.toiletName,
        status: r.toiletStatus,
        lat: r.lat,
        lng: r.lng,
      },
    })),
  };
}

export async function reviewToilet(moderator: SessionUser, id: string, action: 'approve' | 'hide') {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(toilets)
      .set(
        action === 'approve'
          ? { status: 'active', lastConfirmedAt: new Date(), updatedAt: new Date() }
          : { status: 'hidden', updatedAt: new Date() },
      )
      .where(eq(toilets.id, id))
      .returning({ id: toilets.id, status: toilets.status });
    if (!row) throw new ApiError(404, 'not_found');

    // A moderator decision settles every open report about this toilet
    await tx
      .update(reports)
      .set({ status: 'resolved', resolvedAt: new Date(), resolvedBy: moderator.id })
      .where(and(eq(reports.toiletId, id), eq(reports.status, 'open')));
    return row;
  });
}

export async function resolveReport(moderator: SessionUser, reportId: string) {
  const [row] = await db
    .update(reports)
    .set({ status: 'resolved', resolvedAt: new Date(), resolvedBy: moderator.id })
    .where(and(eq(reports.id, reportId), eq(reports.status, 'open')))
    .returning({ id: reports.id });
  if (!row) throw new ApiError(404, 'not_found');
  return row;
}
