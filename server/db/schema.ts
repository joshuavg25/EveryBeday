import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  geometry,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const bidetType = pgEnum('bidet_type', ['electronic_seat', 'hand_sprayer', 'both']);
export const accessType = pgEnum('access_type', ['public', 'customers_only', 'paid']);
export const toiletStatus = pgEnum('toilet_status', ['pending', 'active', 'hidden']);
export const genderType = pgEnum('gender_type', ['all', 'male', 'female', 'unisex']);
export const userRole = pgEnum('user_role', ['user', 'moderator', 'admin']);
export const reportReason = pgEnum('report_reason', [
  'no_bidet',
  'closed',
  'wrong_location',
  'spam',
  'other',
]);
export const reportStatus = pgEnum('report_status', ['open', 'resolved']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // OAuth identity: which provider signed the user in, and their id there
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    name: text('name'),
    email: text('email'),
    image: text('image'),
    role: userRole('role').notNull().default('user'),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_provider_account_unique').on(t.provider, t.providerAccountId)],
);

export const toilets = pgTable(
  'toilets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // English name, always present: EveryBeday is aimed at visitors who may not read Korean
    name: text('name').notNull(),
    // Korean name, optional. Shown instead of `name` on the Korean site when present.
    nameKo: text('name_ko'),
    // x = longitude, y = latitude (WGS84). Drizzle creates this column without an SRID,
    // so queries compare it with SRID-less geometries and cast to geography for meters.
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    address: text('address'),
    buildingName: text('building_name'),
    floor: text('floor'),
    access: accessType('access').notNull().default('public'),
    gender: genderType('gender').notNull().default('all'),
    openingHours: text('opening_hours'),
    is24h: boolean('is_24h').notNull().default(false),
    bidetType: bidetType('bidet_type').notNull(),
    wheelchair: boolean('wheelchair').notNull().default(false),
    // Free-text tip for finding or entering the toilet, e.g. "ask staff for the key"
    note: text('note'),
    status: toiletStatus('status').notNull().default('pending'),
    confirmCount: integer('confirm_count').notNull().default(0),
    lastConfirmedAt: timestamp('last_confirmed_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('toilets_location_gist').using('gist', t.location),
    index('toilets_status_idx').on(t.status),
    index('toilets_created_by_idx').on(t.createdBy, t.createdAt),
  ],
);

// One row per "the bidet is still there" / "the bidet is gone" vote
export const confirmations = pgTable(
  'confirmations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    toiletId: uuid('toilet_id')
      .notNull()
      .references(() => toilets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hasBidet: boolean('has_bidet').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('confirmations_toilet_idx').on(t.toiletId, t.createdAt),
    index('confirmations_user_idx').on(t.userId, t.createdAt),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    toiletId: uuid('toilet_id')
      .notNull()
      .references(() => toilets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: reportReason('reason').notNull(),
    note: text('note'),
    status: reportStatus('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('reports_status_idx').on(t.status, t.createdAt),
    index('reports_user_idx').on(t.userId, t.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Toilet = typeof toilets.$inferSelect;
export type NewToilet = typeof toilets.$inferInsert;
export type Confirmation = typeof confirmations.$inferSelect;
export type Report = typeof reports.$inferSelect;
