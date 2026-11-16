import type { ACCESS_TYPES, BIDET_TYPES, GENDER_TYPES, REPORT_REASONS } from './schemas';

export type BidetType = (typeof BIDET_TYPES)[number];
export type AccessType = (typeof ACCESS_TYPES)[number];
export type GenderType = (typeof GENDER_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ToiletStatus = 'pending' | 'active' | 'hidden';

// What the map needs for a marker and the bottom sheet
export type ToiletPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  floor: string | null;
  buildingName: string | null;
  bidetType: BidetType;
  access: AccessType;
  gender: GenderType;
  is24h: boolean;
  openingHours: string | null;
  wheelchair: boolean;
  status: ToiletStatus;
  lastConfirmedAt: string | null;
  // Only present on "nearest" results
  distanceM?: number;
};

// Everything shown on the detail page
export type ToiletDetail = ToiletPin & {
  address: string | null;
  note: string | null;
  confirmCount: number;
  createdAt: string;
  // Votes from the last 30 days
  recentYes: number;
  recentNo: number;
};

export type QueueToilet = ToiletDetail & { submittedBy: string | null };

export type QueueReport = {
  id: string;
  reason: ReportReason;
  note: string | null;
  createdAt: string;
  reportedBy: string | null;
  toilet: { id: string; name: string; status: ToiletStatus; lat: number; lng: number };
};

export type ModerationQueue = {
  pending: QueueToilet[];
  hidden: QueueToilet[];
  reports: QueueReport[];
};
