'use client';

import { useKakaoLoader } from 'react-kakao-maps-sdk';

export const SEOUL_CITY_HALL = { lat: 37.5666, lng: 126.9784 };

// Pin images live in /public/markers. The tip of the pin (bottom center) marks the spot.
const pinImage = (name: string, scale = 1) => ({
  src: `/markers/${name}.svg`,
  size: { width: 36 * scale, height: 44 * scale },
  options: { offset: { x: 18 * scale, y: 43 * scale } },
});

export const PIN = {
  verified: pinImage('pin'),
  unverified: pinImage('pin-unverified'),
  selected: pinImage('pin-selected', 1.25),
};

// Loads the Kakao Maps SDK once for the whole app. Every map on the site calls this with the
// same options: "clusterer" groups nearby pins, "services" turns coordinates into addresses.
export function useKakao() {
  return useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY!,
    libraries: ['clusterer', 'services'],
  });
}

// Ask the browser where the user is. Resolves to null when denied or unavailable.
export function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}
