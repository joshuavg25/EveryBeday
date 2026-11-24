'use client';

import { useEffect, useState } from 'react';
import { Map } from 'react-kakao-maps-sdk';
import { LocateIcon } from '@/components/icons';
import { Button, Notice } from '@/components/ui';
import { getPosition, SEOUL_CITY_HALL, useKakao } from '@/features/map/kakao';
import { useI18n } from '@/i18n/I18nProvider';
import { SEOUL_BOUNDS } from './schemas';

export type PickedLocation = {
  lat: number;
  lng: number;
  address: string | null;
  buildingName: string | null;
};

const insideSeoul = (lat: number, lng: number) =>
  lat >= SEOUL_BOUNDS.minLat &&
  lat <= SEOUL_BOUNDS.maxLat &&
  lng >= SEOUL_BOUNDS.minLng &&
  lng <= SEOUL_BOUNDS.maxLng;

// Look up the street address of a point with Kakao's geocoder. Resolves with nulls on failure,
// because the address is optional and the user can type it in.
function lookUpAddress(lat: number, lng: number) {
  return new Promise<{ address: string | null; buildingName: string | null }>((resolve) => {
    const nothing = { address: null, buildingName: null };
    try {
      new kakao.maps.services.Geocoder().coord2Address(lng, lat, (result, status) => {
        const first = status === kakao.maps.services.Status.OK ? result[0] : undefined;
        if (!first) return resolve(nothing);
        resolve({
          address: first.road_address?.address_name ?? first.address?.address_name ?? null,
          buildingName: first.road_address?.building_name || null,
        });
      });
    } catch {
      resolve(nothing);
    }
  });
}

// Step 1 of adding a toilet: the pin stays in the middle of the screen and the user moves the
// map underneath it. Easier on a phone than dragging a marker.
export function LocationPicker({
  initial,
  onPick,
}: {
  initial: { lat: number; lng: number } | null;
  onPick: (location: PickedLocation) => void;
}) {
  const { t } = useI18n();
  const [loading, error] = useKakao();
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [center, setCenter] = useState(initial ?? SEOUL_CITY_HALL);
  const [working, setWorking] = useState(false);

  // Start where the user is standing, unless they are coming back to adjust an earlier pick
  useEffect(() => {
    if (!map || initial) return;
    let cancelled = false;
    getPosition().then((position) => {
      if (cancelled || !position) return;
      map.setCenter(new kakao.maps.LatLng(position.lat, position.lng));
    });
    return () => {
      cancelled = true;
    };
  }, [map, initial]);

  async function goToMyLocation() {
    const position = await getPosition();
    if (position && map) map.panTo(new kakao.maps.LatLng(position.lat, position.lng));
  }

  async function useThisSpot() {
    setWorking(true);
    const found = await lookUpAddress(center.lat, center.lng);
    setWorking(false);
    onPick({ ...center, ...found });
  }

  const allowed = insideSeoul(center.lat, center.lng);

  if (error) return <Notice tone="error">{t('map.loadError')}</Notice>;

  return (
    <div className="space-y-3">
      <p className="text-[15px]">{t('add.locationStep')}</p>

      <div className="border-line relative h-[52dvh] min-h-72 overflow-hidden rounded-2xl border">
        {loading ? (
          <div className="bg-foam h-full w-full animate-pulse" />
        ) : (
          <Map
            center={initial ?? SEOUL_CITY_HALL}
            level={initial ? 2 : 4}
            style={{ width: '100%', height: '100%' }}
            onCreate={setMap}
            onIdle={(target) => {
              const c = target.getCenter();
              setCenter({ lat: c.getLat(), lng: c.getLng() });
            }}
          />
        )}

        {/* The fixed pin: its tip sits exactly on the center of the map */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/markers/pin-selected.svg"
          alt=""
          width={45}
          height={55}
          className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full"
        />

        <button
          type="button"
          onClick={goToMyLocation}
          aria-label={t('map.locate')}
          title={t('map.locate')}
          className="shadow-float text-ink bg-surface absolute right-3 bottom-3 z-10 flex h-11 w-11 items-center justify-center rounded-full"
        >
          <LocateIcon />
        </button>
      </div>

      {!allowed && <Notice tone="error">{t('add.outsideSeoul')}</Notice>}

      <Button className="w-full" disabled={loading || working || !allowed} onClick={useThisSpot}>
        {working ? t('common.loading') : t('add.useSpot')}
      </Button>
    </div>
  );
}
