'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CustomOverlayMap,
  Map,
  MapMarker,
  MarkerClusterer,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';

type ToiletPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  floor: string | null;
  bidetType: 'electronic_seat' | 'hand_sprayer' | 'both';
  access: 'public' | 'customers_only' | 'paid';
  is24h: boolean;
  wheelchair: boolean;
};

const SEOUL_CITY_HALL = { lat: 37.5666, lng: 126.9784 };

const BIDET_LABEL: Record<ToiletPin['bidetType'], string> = {
  electronic_seat: 'Electronic bidet seat',
  hand_sprayer: 'Hand sprayer',
  both: 'Bidet seat + hand sprayer',
};

export function BidetMap() {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY!,
    libraries: ['clusterer'],
  });
  const [bbox, setBbox] = useState<string | null>(null);
  const [toilets, setToilets] = useState<ToiletPin[]>([]);
  const [selected, setSelected] = useState<ToiletPin | null>(null);
  const mapRef = useRef<kakao.maps.Map>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Ask the browser for the user's position and move the map there
  const locateMe = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        const map = mapRef.current;
        if (map) {
          map.setLevel(4);
          map.panTo(new kakao.maps.LatLng(loc.lat, loc.lng));
        }
      },
      () => {
        // Permission denied or unavailable: keep the default center
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Locate once when the map is ready
  useEffect(() => {
    if (!loading && !error) locateMe();
  }, [loading, error, locateMe]);

  // Refetch toilets whenever the visible map area changes (debounced)
  useEffect(() => {
    if (!bbox) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/toilets?bbox=${bbox}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { toilets: ToiletPin[] }) => setToilets(data.toilets))
        .catch((err) => {
          if (err.name !== 'AbortError') console.error(err);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bbox]);

  if (error) {
    return (
      <p className="p-4">Failed to load Kakao Maps. Check the API key and registered domain.</p>
    );
  }
  if (loading) {
    return <div className="h-dvh w-full animate-pulse bg-neutral-200" />;
  }

  return (
    <div className="relative h-dvh w-full">
      <Map
        ref={mapRef}
        center={SEOUL_CITY_HALL}
        level={7}
        style={{ width: '100%', height: '100%' }}
        onIdle={(map) => {
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          setBbox(
            [sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()].map((n) => n.toFixed(4)).join(','),
          );
        }}
        onClick={() => setSelected(null)}
      >
        <MarkerClusterer averageCenter minLevel={8}>
          {toilets.map((t) => (
            <MapMarker
              key={t.id}
              position={{ lat: t.lat, lng: t.lng }}
              title={t.name}
              onClick={() => setSelected(t)}
            />
          ))}
        </MarkerClusterer>
        {myLocation && (
          <CustomOverlayMap position={myLocation} zIndex={5}>
            <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.25)]" />
          </CustomOverlayMap>
        )}
      </Map>

      {/* Bottom stack: the locate button sits right above the detail sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={locateMe}
          aria-label="Show my location"
          className={`pointer-events-auto mr-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg ${selected ? '' : 'mb-8'}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>

        {selected && (
          <div className="pointer-events-auto w-full rounded-t-2xl bg-white p-5 text-neutral-900 shadow-2xl">
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              <li>{BIDET_LABEL[selected.bidetType]}</li>
              {selected.floor && <li>Floor: {selected.floor}</li>}
              <li>{selected.is24h ? 'Open 24 hours' : 'Check opening hours'}</li>
              {selected.access === 'customers_only' && <li>Customers only</li>}
              {selected.wheelchair && <li>Wheelchair accessible</li>}
            </ul>
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(selected.name)},${selected.lat},${selected.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Directions
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
