'use client';

import { useEffect, useState } from 'react';
import { api, isAbort } from '@/features/api/client';
import type { ToiletPin } from '@/features/toilets/types';

export type MapFilters = {
  open24h: boolean;
  free: boolean;
  wheelchair: boolean;
  verified: boolean;
  gender: 'male' | 'female' | null;
};

export const NO_FILTERS: MapFilters = {
  open24h: false,
  free: false,
  wheelchair: false,
  verified: false,
  gender: null,
};

export const hasActiveFilters = (f: MapFilters) =>
  f.open24h || f.free || f.wheelchair || f.verified || f.gender !== null;

// "open24h=1&gender=female" — the format /api/toilets expects
export function filterQuery(filters: MapFilters) {
  const params = new URLSearchParams();
  if (filters.open24h) params.set('open24h', '1');
  if (filters.free) params.set('free', '1');
  if (filters.wheelchair) params.set('wheelchair', '1');
  if (filters.verified) params.set('verified', '1');
  if (filters.gender) params.set('gender', filters.gender);
  return params.toString();
}

type Result = { key: string; toilets: ToiletPin[]; failed: boolean };

// Loads the toilets inside the visible map area. Refetches (debounced) whenever the area or the
// filters change, and when `version` is bumped after something was edited.
export function useToilets(bbox: string | null, filters: MapFilters, version: number) {
  const query = filterQuery(filters);
  const key = `${bbox}|${query}|${version}`;
  const [result, setResult] = useState<Result>({ key: '', toilets: [], failed: false });

  useEffect(() => {
    if (!bbox) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<{ toilets: ToiletPin[] }>(`/api/toilets?bbox=${bbox}${query ? `&${query}` : ''}`, {
        signal: controller.signal,
      })
        .then((data) => setResult({ key, toilets: data.toilets, failed: false }))
        .catch((err) => {
          if (!isAbort(err)) setResult((prev) => ({ ...prev, key, failed: true }));
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bbox, query, key]);

  return {
    toilets: result.toilets,
    failed: result.failed,
    // True once the list on screen matches the current area and filters
    settled: bbox !== null && result.key === key,
  };
}
