import { z } from 'zod';

// Shared by the forms (browser) and the API (server), so both agree on what is valid.

export const BIDET_TYPES = ['electronic_seat', 'hand_sprayer', 'both'] as const;
export const ACCESS_TYPES = ['public', 'customers_only', 'paid'] as const;
export const GENDER_TYPES = ['all', 'male', 'female', 'unisex'] as const;
export const REPORT_REASONS = ['no_bidet', 'closed', 'wrong_location', 'spam', 'other'] as const;

// Rough bounding box of Seoul. Submissions outside it are rejected.
export const SEOUL_BOUNDS = { minLat: 37.41, maxLat: 37.72, minLng: 126.76, maxLng: 127.19 };

// Empty strings from form inputs are treated as "not provided"
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === '' ? undefined : s))
    .optional();

export const createToiletSchema = z.object({
  // English name is required; the Korean name is optional
  name: z.string().trim().min(2).max(100),
  nameKo: optionalText(100),
  lat: z.number().min(SEOUL_BOUNDS.minLat).max(SEOUL_BOUNDS.maxLat),
  lng: z.number().min(SEOUL_BOUNDS.minLng).max(SEOUL_BOUNDS.maxLng),
  address: optionalText(200),
  buildingName: optionalText(100),
  floor: optionalText(10),
  access: z.enum(ACCESS_TYPES),
  gender: z.enum(GENDER_TYPES),
  bidetType: z.enum(BIDET_TYPES),
  is24h: z.boolean(),
  openingHours: optionalText(100),
  wheelchair: z.boolean(),
  note: optionalText(300),
  // Set to true after the user has seen the "is this the same toilet?" warning
  confirmNotDuplicate: z.boolean().optional(),
});
export type CreateToiletInput = z.input<typeof createToiletSchema>;

export const updateToiletSchema = createToiletSchema
  .omit({ lat: true, lng: true, confirmNotDuplicate: true })
  .partial();
export type UpdateToiletInput = z.input<typeof updateToiletSchema>;

export const confirmSchema = z.object({ hasBidet: z.boolean() });

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: optionalText(300),
});
export type ReportInput = z.input<typeof reportSchema>;

export const reviewSchema = z.object({ action: z.enum(['approve', 'hide']) });

// Query-string filters for the map: "1" means on, anything else means off
const flag = z
  .string()
  .optional()
  .transform((v) => v === '1');

export const filterSchema = z.object({
  open24h: flag,
  free: flag,
  wheelchair: flag,
  verified: flag,
  gender: z.enum(['male', 'female']).optional(),
});
export type ToiletFilters = z.output<typeof filterSchema>;

// bbox = "minLng,minLat,maxLng,maxLat"
export const bboxSchema = z
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

export const nearestSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export const uuidSchema = z.uuid();
